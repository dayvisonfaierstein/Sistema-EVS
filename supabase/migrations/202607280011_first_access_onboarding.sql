-- Fase 7: onboarding completo, primeiro acesso simplificado e bloqueio por assinatura.

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

  insert into public.audit_logs (
    organization_id, user_id, action, entity, entity_id, new_data
  )
  values (
    target_profile.organization_id,
    auth.uid(),
    'profile.first_access_completed',
    'profile',
    auth.uid(),
    jsonb_build_object('completed_at', now())
  );
end
$$;

create or replace function public.complete_organization_onboarding(
  p_full_name text,
  p_phone text,
  p_legal_name text,
  p_trade_name text,
  p_document text,
  p_legal_document_type text,
  p_email text,
  p_organization_phone text,
  p_whatsapp text,
  p_address text,
  p_address_number text,
  p_address_complement text,
  p_neighborhood text,
  p_city text,
  p_state text,
  p_postal_code text,
  p_responsible_name text,
  p_responsible_phone text,
  p_responsible_whatsapp text,
  p_responsible_email text,
  p_logo_url text default null
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
  select * into target_profile
  from public.profiles
  where id = auth.uid()
    and active
    and deleted_at is null
  for update;

  if not found
     or target_profile.organization_id is null
     or not (target_profile.is_organization_admin or target_profile.role = 'administrator') then
    raise exception 'Somente o administrador principal pode configurar o Espaço'
      using errcode = '42501';
  end if;

  if not target_profile.first_access then
    raise exception 'O primeiro acesso já foi concluído';
  end if;

  if target_profile.provisional_access_expires_at is not null
     and target_profile.provisional_access_expires_at < now() then
    raise exception 'O acesso provisório expirou. Solicite um novo acesso ao suporte';
  end if;

  if char_length(btrim(coalesce(p_full_name, ''))) < 3
     or char_length(btrim(coalesce(p_trade_name, ''))) < 2
     or char_length(btrim(coalesce(p_legal_name, ''))) < 2
     or char_length(btrim(coalesce(p_address, ''))) < 3
     or char_length(btrim(coalesce(p_city, ''))) < 2
     or char_length(btrim(coalesce(p_state, ''))) <> 2
     or char_length(btrim(coalesce(p_responsible_name, ''))) < 3 then
    raise exception 'Preencha todos os dados obrigatórios do Espaço';
  end if;

  update public.organizations
  set
    legal_name = btrim(p_legal_name),
    trade_name = btrim(p_trade_name),
    document = nullif(regexp_replace(coalesce(p_document, ''), '\D', '', 'g'), ''),
    legal_document_type = nullif(btrim(p_legal_document_type), ''),
    email = nullif(lower(btrim(p_email)), ''),
    phone = nullif(btrim(p_organization_phone), ''),
    whatsapp = nullif(btrim(p_whatsapp), ''),
    address = btrim(p_address),
    address_number = nullif(btrim(p_address_number), ''),
    address_complement = nullif(btrim(p_address_complement), ''),
    neighborhood = nullif(btrim(p_neighborhood), ''),
    city = btrim(p_city),
    state = upper(btrim(p_state)),
    postal_code = nullif(btrim(p_postal_code), ''),
    responsible_name = btrim(p_responsible_name),
    responsible_phone = nullif(btrim(p_responsible_phone), ''),
    responsible_whatsapp = nullif(btrim(p_responsible_whatsapp), ''),
    responsible_email = nullif(lower(btrim(p_responsible_email)), ''),
    logo_url = coalesce(nullif(btrim(p_logo_url), ''), logo_url),
    onboarding_completed = true,
    onboarding_completed_at = now()
  where id = target_profile.organization_id;

  update public.profiles
  set
    full_name = btrim(p_full_name),
    phone = nullif(btrim(p_phone), ''),
    first_access = false,
    provisional_access_expires_at = null,
    last_access_at = now()
  where id = auth.uid();

  insert into public.audit_logs (
    organization_id, user_id, action, entity, entity_id, new_data
  )
  values (
    target_profile.organization_id,
    auth.uid(),
    'organization.onboarding_completed',
    'organization',
    target_profile.organization_id,
    jsonb_build_object(
      'completed_at', now(),
      'trade_name', btrim(p_trade_name),
      'subscription_regular', exists (
        select 1 from public.subscriptions
        where organization_id = target_profile.organization_id
          and status = 'active'
      )
    )
  );
end
$$;

create or replace function public.get_my_environment_access()
returns table (
  organization_id uuid,
  organization_name text,
  onboarding_completed boolean,
  organization_status text,
  subscription_status text,
  access_allowed boolean,
  block_reason text
)
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  target_profile public.profiles%rowtype;
  target_organization public.organizations%rowtype;
  effective_subscription_status text;
begin
  select * into target_profile
  from public.profiles
  where id = auth.uid()
    and active
    and deleted_at is null;

  if not found then
    return;
  end if;

  if target_profile.is_platform_admin or target_profile.role = 'super_admin' then
    return query select
      null::uuid, 'Espaço+ Admin'::text, true, 'active'::text,
      'active'::text, true, null::text;
    return;
  end if;

  select * into target_organization
  from public.organizations
  where id = target_profile.organization_id
    and deleted_at is null;

  if not found then
    return query select
      target_profile.organization_id, null::text, false, 'inactive'::text,
      'pending'::text, false, 'Organização não encontrada'::text;
    return;
  end if;

  select s.status into effective_subscription_status
  from public.subscriptions s
  where s.organization_id = target_organization.id
    and s.status <> 'cancelled'
  order by s.created_at desc
  limit 1;

  effective_subscription_status :=
    coalesce(effective_subscription_status, target_organization.subscription_status, 'pending');

  return query select
    target_organization.id,
    target_organization.trade_name,
    target_organization.onboarding_completed,
    target_organization.status,
    effective_subscription_status,
    (
      target_organization.onboarding_completed
      and target_organization.active
      and target_organization.status in ('trial', 'active')
      and effective_subscription_status in ('trial', 'active')
    ),
    case
      when not target_organization.onboarding_completed then
        'Conclua a configuração inicial do Espaço'
      when not target_organization.active
        or target_organization.status in ('blocked', 'cancelled', 'inactive') then
        coalesce(target_organization.blocked_reason, 'Ambiente indisponível')
      when effective_subscription_status = 'pending' then
        'Aguardando ativação da assinatura'
      when effective_subscription_status = 'overdue' then
        'Assinatura vencida'
      when effective_subscription_status = 'grace_period' then
        'Assinatura em período de carência'
      when effective_subscription_status = 'blocked' then
        'Assinatura bloqueada'
      when effective_subscription_status = 'cancelled' then
        'Assinatura cancelada'
      else 'Ambiente aguardando liberação'
    end;
end
$$;

revoke all on function public.complete_first_access(text, text) from public;
revoke all on function public.complete_organization_onboarding(
  text, text, text, text, text, text, text, text, text, text, text,
  text, text, text, text, text, text, text, text, text, text
) from public;
revoke all on function public.get_my_environment_access() from public;

grant execute on function public.complete_first_access(text, text) to authenticated;
grant execute on function public.complete_organization_onboarding(
  text, text, text, text, text, text, text, text, text, text, text,
  text, text, text, text, text, text, text, text, text, text
) to authenticated;
grant execute on function public.get_my_environment_access() to authenticated;

comment on function public.complete_organization_onboarding(
  text, text, text, text, text, text, text, text, text, text, text,
  text, text, text, text, text, text, text, text, text, text
) is 'Conclui de forma transacional o cadastro inicial do Espaço e do administrador.';

comment on function public.get_my_environment_access() is
  'Informa ao frontend se o ambiente está configurado e com assinatura regular.';
