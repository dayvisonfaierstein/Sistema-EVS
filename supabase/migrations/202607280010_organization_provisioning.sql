-- Fase 6: provisionamento controlado de organizações e primeiro acesso obrigatório.

alter table public.profiles
  add column if not exists invited_at timestamptz,
  add column if not exists provisioned_by uuid references public.profiles(id),
  add column if not exists provisional_access_expires_at timestamptz;

create index if not exists profiles_first_access_expiration_idx
  on public.profiles(first_access, provisional_access_expires_at)
  where first_access;

create or replace function public.complete_first_access(
  p_full_name text,
  p_phone text default null
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  target_profile public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado' using errcode = '42501';
  end if;

  if char_length(btrim(coalesce(p_full_name, ''))) < 3 then
    raise exception 'Informe o nome completo';
  end if;

  select * into target_profile
  from public.profiles
  where id = auth.uid()
    and active
    and deleted_at is null
  for update;

  if not found then
    raise exception 'Perfil de acesso não encontrado';
  end if;

  if not target_profile.first_access then
    raise exception 'O primeiro acesso já foi concluído';
  end if;

  if target_profile.provisional_access_expires_at is not null
     and target_profile.provisional_access_expires_at < now() then
    raise exception 'O acesso provisório expirou. Solicite um novo acesso ao suporte';
  end if;

  update public.profiles
  set
    full_name = btrim(p_full_name),
    phone = nullif(btrim(p_phone), ''),
    first_access = false,
    provisional_access_expires_at = null,
    last_access_at = now()
  where id = auth.uid();

  if target_profile.organization_id is not null then
    update public.organizations
    set
      onboarding_completed = true,
      onboarding_completed_at = coalesce(onboarding_completed_at, now()),
      responsible_name = coalesce(responsible_name, btrim(p_full_name)),
      responsible_phone = coalesce(responsible_phone, nullif(btrim(p_phone), ''))
    where id = target_profile.organization_id;
  end if;

  insert into public.audit_logs (
    organization_id,
    user_id,
    action,
    entity,
    entity_id,
    new_data
  )
  values (
    target_profile.organization_id,
    auth.uid(),
    'organization.first_access_completed',
    'profile',
    auth.uid(),
    jsonb_build_object('completed_at', now())
  );
end
$$;

revoke all on function public.complete_first_access(text, text) from public;
grant execute on function public.complete_first_access(text, text) to authenticated;

comment on function public.complete_first_access(text, text) is
  'Conclui o acesso inicial após a troca da senha no Supabase Auth, sem armazenar senhas.';
