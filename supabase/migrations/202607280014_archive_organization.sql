-- Arquivamento seguro de organizações pelo Super Admin.
-- Preserva todos os históricos e bloqueia novos acessos.

create or replace function public.admin_archive_organization(
  target_organization_id uuid,
  archive_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  target_organization public.organizations%rowtype;
begin
  if not public.is_super_admin() then
    raise exception 'Somente o Super Admin pode excluir uma organização'
      using errcode = '42501';
  end if;

  select * into target_organization
  from public.organizations
  where id = target_organization_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'Organização não encontrada';
  end if;

  update public.profiles
  set active = false
  where organization_id = target_organization_id
    and active;

  update public.subscriptions
  set
    status = 'cancelled',
    cancelled_at = coalesce(cancelled_at, now()),
    ended_at = coalesce(ended_at, now()),
    updated_by = auth.uid()
  where organization_id = target_organization_id
    and status <> 'cancelled';

  update public.organizations
  set
    status = 'cancelled',
    subscription_status = 'cancelled',
    active = false,
    blocked_at = coalesce(blocked_at, now()),
    blocked_reason = coalesce(nullif(btrim(archive_reason), ''), 'Organização excluída pelo Super Admin'),
    deleted_at = now()
  where id = target_organization_id;

  insert into public.audit_logs (
    organization_id, user_id, action, entity, entity_id, old_data, new_data
  )
  values (
    target_organization_id,
    auth.uid(),
    'organization.archived',
    'organization',
    target_organization_id,
    to_jsonb(target_organization),
    jsonb_build_object(
      'deleted_at', now(),
      'reason', coalesce(nullif(btrim(archive_reason), ''), 'Organização excluída pelo Super Admin')
    )
  );
end
$$;

revoke all on function public.admin_archive_organization(uuid, text) from public;
grant execute on function public.admin_archive_organization(uuid, text) to authenticated;

comment on function public.admin_archive_organization(uuid, text) is
  'Arquiva a organização, bloqueia usuários e cancela a assinatura sem apagar históricos.';
