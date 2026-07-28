-- Fase 9: persistência por diferença e auditoria consolidada das permissões.

create or replace function public.set_user_permissions(
  target_user_id uuid,
  permission_keys text[],
  selected_template_key text default 'custom'
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  target_profile public.profiles%rowtype;
  caller_organization uuid := public.current_organization_id();
  normalized_keys text[];
  previous_keys text[];
  added_keys text[];
  removed_keys text[];
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado';
  end if;

  select coalesce(array_agg(distinct requested_key order by requested_key), array[]::text[])
  into normalized_keys
  from unnest(coalesce(permission_keys, array[]::text[])) requested_key;

  select * into target_profile
  from public.profiles
  where id = target_user_id
    and active
    and deleted_at is null;

  if not found then
    raise exception 'Usuário não encontrado ou inativo';
  end if;

  if not public.is_super_admin() then
    if not public.is_organization_admin()
       or target_profile.organization_id is distinct from caller_organization then
      raise exception 'Sem permissão para alterar este usuário';
    end if;
  end if;

  if target_profile.is_platform_admin
     or target_profile.role = 'super_admin'
     or target_profile.is_organization_admin
     or target_profile.role = 'administrator' then
    raise exception 'Administradores possuem acesso total implícito';
  end if;

  if selected_template_key is null
     or not exists (
       select 1 from public.access_templates
       where key = selected_template_key and active
     ) then
    raise exception 'Modelo de acesso inválido';
  end if;

  if exists (
    select 1
    from unnest(normalized_keys) requested_key
    left join public.permissions p on p.key = requested_key and p.active
    where p.id is null
  ) then
    raise exception 'Uma ou mais permissões são inválidas';
  end if;

  select coalesce(array_agg(p.key order by p.key), array[]::text[])
  into previous_keys
  from public.user_permissions up
  join public.permissions p on p.id = up.permission_id
  where up.user_id = target_user_id
    and up.organization_id = target_profile.organization_id
    and up.granted
    and p.active;

  if previous_keys = normalized_keys
     and target_profile.access_template is not distinct from selected_template_key then
    return;
  end if;

  select coalesce(array_agg(key order by key), array[]::text[])
  into added_keys
  from unnest(normalized_keys) key
  where not (key = any(previous_keys));

  select coalesce(array_agg(key order by key), array[]::text[])
  into removed_keys
  from unnest(previous_keys) key
  where not (key = any(normalized_keys));

  delete from public.user_permissions up
  where up.user_id = target_user_id
    and up.organization_id = target_profile.organization_id
    and not exists (
      select 1
      from public.permissions p
      where p.id = up.permission_id
        and p.key = any(normalized_keys)
    );

  insert into public.user_permissions (
    organization_id, user_id, permission_id, granted, granted_by
  )
  select
    target_profile.organization_id,
    target_user_id,
    p.id,
    true,
    auth.uid()
  from public.permissions p
  where p.active
    and p.key = any(normalized_keys)
  on conflict (organization_id, user_id, permission_id)
  do update set
    granted = true,
    granted_by = auth.uid(),
    updated_at = now()
  where not user_permissions.granted;

  if target_profile.access_template is distinct from selected_template_key then
    update public.profiles
    set access_template = selected_template_key
    where id = target_user_id;
  end if;

  insert into public.audit_logs (
    organization_id, user_id, action, entity, entity_id, old_data, new_data
  )
  values (
    target_profile.organization_id,
    auth.uid(),
    'permission.set_changed',
    'profile',
    target_user_id,
    jsonb_build_object(
      'access_template', target_profile.access_template,
      'permissions', to_jsonb(previous_keys)
    ),
    jsonb_build_object(
      'access_template', selected_template_key,
      'permissions', to_jsonb(normalized_keys),
      'added', to_jsonb(added_keys),
      'removed', to_jsonb(removed_keys)
    )
  );
end
$$;

revoke all on function public.set_user_permissions(uuid, text[], text) from public;
grant execute on function public.set_user_permissions(uuid, text[], text) to authenticated;

comment on function public.set_user_permissions(uuid, text[], text) is
  'Persiste somente diferenças de permissões e registra comparação detalhada na auditoria.';
