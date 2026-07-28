-- Fase 1: base SaaS, identidade administrativa e isolamento multiempresa.
-- Migration incremental: preserva organizações, perfis e políticas existentes.

alter table public.organizations
  add column if not exists status text,
  add column if not exists onboarding_completed boolean,
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists legal_document_type text,
  add column if not exists address_number text,
  add column if not exists address_complement text,
  add column if not exists neighborhood text,
  add column if not exists responsible_name text,
  add column if not exists responsible_phone text,
  add column if not exists responsible_whatsapp text,
  add column if not exists responsible_email text,
  add column if not exists blocked_at timestamptz,
  add column if not exists blocked_reason text,
  add column if not exists deleted_at timestamptz;

update public.organizations
set
  status = case
    when not active then 'inactive'
    when subscription_status = 'blocked' then 'blocked'
    when subscription_status = 'trial' then 'trial'
    else 'active'
  end,
  onboarding_completed = true,
  onboarding_completed_at = coalesce(onboarding_completed_at, created_at)
where status is null
   or onboarding_completed is null;

alter table public.organizations
  alter column status set default 'pending',
  alter column status set not null,
  alter column onboarding_completed set default false,
  alter column onboarding_completed set not null;

alter table public.organizations
  drop constraint if exists organizations_status_check;

alter table public.organizations
  add constraint organizations_status_check
  check (status in (
    'pending',
    'trial',
    'active',
    'grace_period',
    'blocked',
    'cancelled',
    'inactive'
  ));

create index if not exists organizations_status_idx
  on public.organizations(status)
  where deleted_at is null;

alter table public.profiles
  add column if not exists is_platform_admin boolean,
  add column if not exists is_organization_admin boolean,
  add column if not exists first_access boolean,
  add column if not exists job_title text,
  add column if not exists access_template text,
  add column if not exists deleted_at timestamptz;

update public.profiles
set
  is_platform_admin = role = 'super_admin',
  is_organization_admin = role = 'administrator',
  first_access = false
where is_platform_admin is null
   or is_organization_admin is null
   or first_access is null;

alter table public.profiles
  alter column is_platform_admin set default false,
  alter column is_platform_admin set not null,
  alter column is_organization_admin set default false,
  alter column is_organization_admin set not null,
  alter column first_access set default true,
  alter column first_access set not null;

alter table public.profiles
  drop constraint if exists profiles_platform_admin_organization_check;

alter table public.profiles
  add constraint profiles_platform_admin_organization_check
  check (not is_platform_admin or organization_id is null);

create index if not exists profiles_organization_active_idx
  on public.profiles(organization_id, active)
  where deleted_at is null;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and active
        and deleted_at is null
        and (is_platform_admin or role = 'super_admin')
    ),
    false
  )
$$;

create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select organization_id
  from public.profiles
  where id = auth.uid()
    and active
    and deleted_at is null
    and not (is_platform_admin or role = 'super_admin')
  limit 1
$$;

create or replace function public.is_organization_admin()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and organization_id is not null
        and active
        and deleted_at is null
        and (is_organization_admin or role = 'administrator')
    ),
    false
  )
$$;

create or replace function public.has_permission(permission_key text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  allowed boolean := false;
begin
  if permission_key is null or btrim(permission_key) = '' then
    return false;
  end if;

  if public.is_super_admin() or public.is_organization_admin() then
    return true;
  end if;

  -- As tabelas granulares serão criadas na Fase 2. A verificação já fica
  -- preparada sem quebrar esta migration quando elas ainda não existem.
  if to_regclass('public.permissions') is null
     or to_regclass('public.user_permissions') is null then
    return false;
  end if;

  execute $query$
    select coalesce(bool_or(up.granted), false)
    from public.user_permissions up
    join public.permissions p on p.id = up.permission_id
    where up.user_id = auth.uid()
      and up.organization_id = public.current_organization_id()
      and p.key = $1
  $query$
  into allowed
  using permission_key;

  return coalesce(allowed, false);
end
$$;

create or replace function public.can_access_organization(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    public.is_super_admin()
    or (
      target_organization_id is not null
      and target_organization_id = public.current_organization_id()
    ),
    false
  )
$$;

revoke all on function public.is_super_admin() from public;
revoke all on function public.is_organization_admin() from public;
revoke all on function public.current_organization_id() from public;
revoke all on function public.has_permission(text) from public;
revoke all on function public.can_access_organization(uuid) from public;

grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_organization_admin() to authenticated;
grant execute on function public.current_organization_id() to authenticated;
grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.can_access_organization(uuid) to authenticated;

-- Impede que administradores de uma organização elevem privilégios, troquem a
-- organização de um perfil ou criem um administrador da plataforma por chamada direta.
create or replace function public.protect_profile_security_fields()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if auth.uid() is null or public.is_super_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.organization_id is distinct from public.current_organization_id()
       or new.is_platform_admin
       or new.role = 'super_admin' then
      raise exception 'Operação de perfil não autorizada';
    end if;
  else
    if new.organization_id is distinct from old.organization_id
       or new.is_platform_admin is distinct from old.is_platform_admin
       or new.role is distinct from old.role
       or new.is_organization_admin is distinct from old.is_organization_admin
       or new.deleted_at is distinct from old.deleted_at then
      raise exception 'Campos de segurança do perfil não podem ser alterados diretamente';
    end if;
  end if;

  return new;
end
$$;

drop trigger if exists protect_profile_security_fields on public.profiles;
create trigger protect_profile_security_fields
before insert or update on public.profiles
for each row execute function public.protect_profile_security_fields();

-- Status, bloqueio e assinatura são controlados exclusivamente pela plataforma.
create or replace function public.protect_organization_platform_fields()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if auth.uid() is null or public.is_super_admin() then
    return new;
  end if;

  if new.status is distinct from old.status
     or new.subscription_status is distinct from old.subscription_status
     or new.active is distinct from old.active
     or new.blocked_at is distinct from old.blocked_at
     or new.blocked_reason is distinct from old.blocked_reason
     or new.deleted_at is distinct from old.deleted_at then
    raise exception 'Situação da organização só pode ser alterada pela plataforma';
  end if;

  return new;
end
$$;

drop trigger if exists protect_organization_platform_fields on public.organizations;
create trigger protect_organization_platform_fields
before update on public.organizations
for each row execute function public.protect_organization_platform_fields();

-- Corrige a política ampla anterior de perfis.
drop policy if exists profiles_admin_write on public.profiles;
drop policy if exists profiles_org_insert on public.profiles;
drop policy if exists profiles_org_update on public.profiles;

create policy profiles_org_insert
on public.profiles
for insert
with check (
  public.is_super_admin()
  or (
    public.is_organization_admin()
    and organization_id = public.current_organization_id()
    and not is_platform_admin
    and role <> 'super_admin'
  )
);

create policy profiles_org_update
on public.profiles
for update
using (
  public.is_super_admin()
  or (
    public.is_organization_admin()
    and organization_id = public.current_organization_id()
  )
  or id = auth.uid()
)
with check (
  public.is_super_admin()
  or organization_id = public.current_organization_id()
);

drop policy if exists organizations_platform_insert on public.organizations;
drop policy if exists organizations_platform_update on public.organizations;
drop policy if exists organizations_org_update on public.organizations;

create policy organizations_platform_insert
on public.organizations
for insert
with check (public.is_super_admin());

create policy organizations_platform_update
on public.organizations
for update
using (public.is_super_admin())
with check (public.is_super_admin());

create policy organizations_org_update
on public.organizations
for update
using (
  id = public.current_organization_id()
  and public.is_organization_admin()
)
with check (
  id = public.current_organization_id()
  and public.is_organization_admin()
);

-- Uma política RESTRICTIVE é combinada com todas as políticas existentes usando
-- AND. Assim, uma política antiga permissiva nunca consegue atravessar organizações.
do $$
declare
  table_record record;
  policy_name text;
begin
  for table_record in
    select distinct c.table_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema
     and t.table_name = c.table_name
    where c.table_schema = 'public'
      and c.column_name = 'organization_id'
      and t.table_type = 'BASE TABLE'
      and c.table_name <> 'profiles'
  loop
    policy_name := table_record.table_name || '_tenant_boundary';

    execute format(
      'drop policy if exists %I on public.%I',
      policy_name,
      table_record.table_name
    );

    execute format(
      'create policy %I on public.%I as restrictive for all
       using (public.can_access_organization(organization_id))
       with check (public.can_access_organization(organization_id))',
      policy_name,
      table_record.table_name
    );
  end loop;
end
$$;

drop policy if exists profiles_tenant_boundary on public.profiles;
create policy profiles_tenant_boundary
on public.profiles
as restrictive
for all
using (
  public.is_super_admin()
  or id = auth.uid()
  or (
    organization_id is not null
    and organization_id = public.current_organization_id()
  )
)
with check (
  public.is_super_admin()
  or (
    organization_id is not null
    and organization_id = public.current_organization_id()
  )
);

-- O autocadastro público de organizações é incompatível com o modelo SaaS.
-- A função é mantida para compatibilidade histórica, mas deixa de ser executável.
revoke execute on function public.bootstrap_organization(text, text, text, text, text)
from authenticated;

comment on function public.has_permission(text) is
  'Valida permissão granular. Super Admin e administrador da organização têm acesso implícito.';
comment on function public.can_access_organization(uuid) is
  'Barreira central de isolamento multiempresa usada em políticas RLS restritivas.';
