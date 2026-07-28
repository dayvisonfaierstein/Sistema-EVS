-- Fase 4: planos, assinaturas e mensalidades administradas pelo Super Admin.
-- Não integra gateway nesta etapa; apenas reserva identificadores e metadados.

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  price numeric(12, 2) not null default 0 check (price >= 0),
  currency text not null default 'BRL' check (char_length(currency) = 3),
  billing_interval text not null default 'monthly'
    check (billing_interval in ('monthly', 'quarterly', 'semiannual', 'annual')),
  interval_count integer not null default 1 check (interval_count > 0),
  trial_days integer not null default 0 check (trial_days >= 0),
  grace_days integer not null default 5 check (grace_days >= 0),
  features jsonb not null default '[]'::jsonb
    check (jsonb_typeof(features) = 'array'),
  limits jsonb not null default '{}'::jsonb
    check (jsonb_typeof(limits) = 'object'),
  gateway_provider text,
  gateway_plan_id text,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (code = lower(code) and code ~ '^[a-z0-9][a-z0-9_-]*$')
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  plan_id uuid not null references public.plans(id),
  status text not null default 'pending'
    check (status in (
      'pending',
      'active',
      'overdue',
      'grace_period',
      'blocked',
      'cancelled'
    )),
  starts_on date not null default current_date,
  current_period_start date,
  current_period_end date,
  next_due_date date,
  due_day integer not null default 10 check (due_day between 1 and 28),
  grace_until date,
  cancelled_at timestamptz,
  blocked_at timestamptz,
  ended_at timestamptz,
  price_snapshot numeric(12, 2) not null check (price_snapshot >= 0),
  currency text not null default 'BRL' check (char_length(currency) = 3),
  billing_interval text not null
    check (billing_interval in ('monthly', 'quarterly', 'semiannual', 'annual')),
  interval_count integer not null default 1 check (interval_count > 0),
  manual_billing boolean not null default true,
  auto_renew boolean not null default false,
  gateway_provider text,
  gateway_customer_id text,
  gateway_subscription_id text,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  notes text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create unique index if not exists subscriptions_one_current_per_organization_idx
  on public.subscriptions(organization_id)
  where status <> 'cancelled';

create index if not exists subscriptions_status_due_idx
  on public.subscriptions(status, next_due_date);

create index if not exists subscriptions_plan_idx
  on public.subscriptions(plan_id, status);

create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  subscription_id uuid not null,
  reference_period_start date not null,
  reference_period_end date not null,
  due_date date not null,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'BRL' check (char_length(currency) = 3),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'overdue', 'cancelled', 'refunded')),
  paid_at timestamptz,
  paid_amount numeric(12, 2) check (paid_amount is null or paid_amount >= 0),
  payment_method text,
  payment_reference text,
  receipt_url text,
  gateway_provider text,
  gateway_payment_id text,
  gateway_payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(gateway_payload) = 'object'),
  notes text,
  recorded_by uuid references public.profiles(id),
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (subscription_id, organization_id)
    references public.subscriptions(id, organization_id),
  unique (subscription_id, reference_period_start),
  check (reference_period_end >= reference_period_start),
  check (
    (status = 'paid' and paid_at is not null and paid_amount is not null)
    or status <> 'paid'
  )
);

create index if not exists subscription_payments_organization_due_idx
  on public.subscription_payments(organization_id, due_date desc);

create index if not exists subscription_payments_status_due_idx
  on public.subscription_payments(status, due_date);

drop trigger if exists set_updated_at on public.plans;
create trigger set_updated_at
before update on public.plans
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.subscriptions;
create trigger set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.subscription_payments;
create trigger set_updated_at
before update on public.subscription_payments
for each row execute function public.set_updated_at();

alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_payments enable row level security;

drop policy if exists plans_authenticated_read on public.plans;
drop policy if exists plans_super_admin_insert on public.plans;
drop policy if exists plans_super_admin_update on public.plans;
drop policy if exists plans_super_admin_delete on public.plans;

create policy plans_authenticated_read
on public.plans for select to authenticated
using (
  active
  or public.is_super_admin()
  or exists (
    select 1
    from public.subscriptions s
    where s.plan_id = plans.id
      and s.organization_id = public.current_organization_id()
  )
);

create policy plans_super_admin_insert
on public.plans for insert to authenticated
with check (public.is_super_admin());

create policy plans_super_admin_update
on public.plans for update to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

create policy plans_super_admin_delete
on public.plans for delete to authenticated
using (public.is_super_admin());

drop policy if exists subscriptions_organization_read on public.subscriptions;
drop policy if exists subscriptions_super_admin_insert on public.subscriptions;
drop policy if exists subscriptions_super_admin_update on public.subscriptions;
drop policy if exists subscriptions_super_admin_delete on public.subscriptions;

create policy subscriptions_organization_read
on public.subscriptions for select to authenticated
using (
  public.is_super_admin()
  or (
    organization_id = public.current_organization_id()
    and public.has_permission('settings.subscription.view')
  )
);

create policy subscriptions_super_admin_insert
on public.subscriptions for insert to authenticated
with check (public.is_super_admin());

create policy subscriptions_super_admin_update
on public.subscriptions for update to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

create policy subscriptions_super_admin_delete
on public.subscriptions for delete to authenticated
using (public.is_super_admin());

drop policy if exists subscription_payments_organization_read
  on public.subscription_payments;
drop policy if exists subscription_payments_super_admin_insert
  on public.subscription_payments;
drop policy if exists subscription_payments_super_admin_update
  on public.subscription_payments;
drop policy if exists subscription_payments_super_admin_delete
  on public.subscription_payments;

create policy subscription_payments_organization_read
on public.subscription_payments for select to authenticated
using (
  public.is_super_admin()
  or (
    organization_id = public.current_organization_id()
    and public.has_permission('settings.subscription.view')
  )
);

create policy subscription_payments_super_admin_insert
on public.subscription_payments for insert to authenticated
with check (public.is_super_admin());

create policy subscription_payments_super_admin_update
on public.subscription_payments for update to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

create policy subscription_payments_super_admin_delete
on public.subscription_payments for delete to authenticated
using (public.is_super_admin());

create or replace function public.audit_platform_billing_change()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  target_organization uuid;
  target_id uuid;
begin
  target_organization := case
    when tg_table_name = 'plans' then null
    else coalesce(new.organization_id, old.organization_id)
  end;
  target_id := coalesce(new.id, old.id);

  insert into public.audit_logs (
    organization_id,
    user_id,
    action,
    entity,
    entity_id,
    old_data,
    new_data
  )
  values (
    target_organization,
    auth.uid(),
    'platform_billing.' || lower(tg_op),
    tg_table_name,
    target_id,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end
$$;

do $$
declare
  billing_table text;
begin
  foreach billing_table in array array[
    'plans',
    'subscriptions',
    'subscription_payments'
  ]
  loop
    execute format(
      'drop trigger if exists audit_platform_billing_change on public.%I',
      billing_table
    );
    execute format(
      'create trigger audit_platform_billing_change
       after insert or update or delete on public.%I
       for each row execute function public.audit_platform_billing_change()',
      billing_table
    );
  end loop;
end
$$;

create or replace function public.admin_create_subscription(
  p_organization_id uuid,
  p_plan_id uuid,
  p_starts_on date default current_date,
  p_due_day integer default 10,
  p_price_override numeric default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  selected_plan public.plans%rowtype;
  result_id uuid;
  first_due_date date;
  period_months integer;
begin
  if auth.uid() is null or not public.is_super_admin() then
    raise exception 'Somente o Super Admin pode criar assinaturas'
      using errcode = '42501';
  end if;

  if p_due_day not between 1 and 28 then
    raise exception 'O dia de vencimento deve estar entre 1 e 28';
  end if;

  if not exists (
    select 1 from public.organizations
    where id = p_organization_id and deleted_at is null
  ) then
    raise exception 'Organização não encontrada';
  end if;

  select * into selected_plan
  from public.plans
  where id = p_plan_id and active;

  if not found then
    raise exception 'Plano não encontrado ou inativo';
  end if;

  if p_price_override is not null and p_price_override < 0 then
    raise exception 'O valor contratado não pode ser negativo';
  end if;

  if exists (
    select 1 from public.subscriptions
    where organization_id = p_organization_id
      and status <> 'cancelled'
  ) then
    raise exception 'A organização já possui uma assinatura vigente';
  end if;

  first_due_date := make_date(
    extract(year from p_starts_on)::integer,
    extract(month from p_starts_on)::integer,
    p_due_day
  );
  if first_due_date < p_starts_on then
    first_due_date := (first_due_date + interval '1 month')::date;
  end if;

  period_months := selected_plan.interval_count * case selected_plan.billing_interval
    when 'monthly' then 1
    when 'quarterly' then 3
    when 'semiannual' then 6
    when 'annual' then 12
  end;

  insert into public.subscriptions (
    organization_id,
    plan_id,
    status,
    starts_on,
    current_period_start,
    current_period_end,
    next_due_date,
    due_day,
    grace_until,
    price_snapshot,
    currency,
    billing_interval,
    interval_count,
    notes,
    created_by,
    updated_by
  )
  values (
    p_organization_id,
    p_plan_id,
    'pending',
    p_starts_on,
    p_starts_on,
    (
      p_starts_on
      + make_interval(months => period_months)
      - interval '1 day'
    )::date,
    first_due_date,
    p_due_day,
    first_due_date + selected_plan.grace_days,
    coalesce(p_price_override, selected_plan.price),
    selected_plan.currency,
    selected_plan.billing_interval,
    selected_plan.interval_count,
    nullif(btrim(p_notes), ''),
    auth.uid(),
    auth.uid()
  )
  returning id into result_id;

  update public.organizations
  set
    status = 'pending',
    subscription_status = 'pending',
    active = true,
    blocked_at = null,
    blocked_reason = null
  where id = p_organization_id;

  return result_id;
end
$$;

create or replace function public.admin_set_subscription_status(
  p_subscription_id uuid,
  p_status text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  target_subscription public.subscriptions%rowtype;
  organization_status text;
begin
  if auth.uid() is null or not public.is_super_admin() then
    raise exception 'Somente o Super Admin pode alterar assinaturas'
      using errcode = '42501';
  end if;

  if p_status not in (
    'pending', 'active', 'overdue', 'grace_period', 'blocked', 'cancelled'
  ) then
    raise exception 'Situação de assinatura inválida';
  end if;

  select * into target_subscription
  from public.subscriptions
  where id = p_subscription_id
  for update;

  if not found then
    raise exception 'Assinatura não encontrada';
  end if;

  if target_subscription.status = 'cancelled' and p_status <> 'cancelled' then
    raise exception 'Uma assinatura cancelada não pode ser reativada; crie uma nova';
  end if;

  update public.subscriptions
  set
    status = p_status,
    blocked_at = case when p_status = 'blocked' then now() else null end,
    cancelled_at = case when p_status = 'cancelled' then now() else null end,
    ended_at = case when p_status = 'cancelled' then now() else ended_at end,
    notes = case
      when nullif(btrim(p_reason), '') is null then notes
      when notes is null then btrim(p_reason)
      else notes || E'\n' || btrim(p_reason)
    end,
    updated_by = auth.uid()
  where id = p_subscription_id;

  organization_status := case p_status
    when 'overdue' then 'grace_period'
    else p_status
  end;

  update public.organizations
  set
    status = organization_status,
    subscription_status = p_status,
    active = p_status not in ('blocked', 'cancelled'),
    blocked_at = case when p_status = 'blocked' then now() else null end,
    blocked_reason = case
      when p_status = 'blocked' then coalesce(nullif(btrim(p_reason), ''), 'Assinatura bloqueada')
      else null
    end
  where id = target_subscription.organization_id;
end
$$;

create or replace function public.admin_create_subscription_payment(
  p_subscription_id uuid,
  p_reference_period_start date,
  p_reference_period_end date,
  p_due_date date,
  p_amount numeric default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  target_subscription public.subscriptions%rowtype;
  result_id uuid;
begin
  if auth.uid() is null or not public.is_super_admin() then
    raise exception 'Somente o Super Admin pode gerar mensalidades'
      using errcode = '42501';
  end if;

  if p_reference_period_end < p_reference_period_start then
    raise exception 'Período de referência inválido';
  end if;

  if p_amount is not null and p_amount < 0 then
    raise exception 'O valor da mensalidade não pode ser negativo';
  end if;

  select * into target_subscription
  from public.subscriptions
  where id = p_subscription_id
    and status <> 'cancelled';

  if not found then
    raise exception 'Assinatura não encontrada ou cancelada';
  end if;

  insert into public.subscription_payments (
    organization_id,
    subscription_id,
    reference_period_start,
    reference_period_end,
    due_date,
    amount,
    currency,
    status,
    notes,
    recorded_by
  )
  values (
    target_subscription.organization_id,
    target_subscription.id,
    p_reference_period_start,
    p_reference_period_end,
    p_due_date,
    coalesce(p_amount, target_subscription.price_snapshot),
    target_subscription.currency,
    'pending',
    nullif(btrim(p_notes), ''),
    auth.uid()
  )
  returning id into result_id;

  update public.subscriptions
  set
    current_period_start = p_reference_period_start,
    current_period_end = p_reference_period_end,
    next_due_date = p_due_date,
    grace_until = p_due_date + (
      select grace_days from public.plans where id = target_subscription.plan_id
    ),
    updated_by = auth.uid()
  where id = target_subscription.id;

  return result_id;
end
$$;

create or replace function public.admin_register_subscription_payment(
  p_payment_id uuid,
  p_paid_at timestamptz default now(),
  p_paid_amount numeric default null,
  p_payment_method text default null,
  p_payment_reference text default null,
  p_receipt_url text default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  target_payment public.subscription_payments%rowtype;
begin
  if auth.uid() is null or not public.is_super_admin() then
    raise exception 'Somente o Super Admin pode registrar pagamentos'
      using errcode = '42501';
  end if;

  select * into target_payment
  from public.subscription_payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Mensalidade não encontrada';
  end if;

  if target_payment.status in ('cancelled', 'refunded') then
    raise exception 'Esta mensalidade não pode ser marcada como paga';
  end if;

  update public.subscription_payments
  set
    status = 'paid',
    paid_at = coalesce(p_paid_at, now()),
    paid_amount = coalesce(p_paid_amount, target_payment.amount),
    payment_method = nullif(btrim(p_payment_method), ''),
    payment_reference = nullif(btrim(p_payment_reference), ''),
    receipt_url = nullif(btrim(p_receipt_url), ''),
    notes = case
      when nullif(btrim(p_notes), '') is null then notes
      when notes is null then btrim(p_notes)
      else notes || E'\n' || btrim(p_notes)
    end,
    recorded_by = auth.uid()
  where id = p_payment_id;

  update public.subscriptions
  set
    status = 'active',
    blocked_at = null,
    updated_by = auth.uid()
  where id = target_payment.subscription_id
    and status <> 'cancelled';

  update public.organizations
  set
    status = 'active',
    subscription_status = 'active',
    active = true,
    blocked_at = null,
    blocked_reason = null
  where id = target_payment.organization_id;
end
$$;

create or replace function public.admin_refresh_subscription_statuses(
  p_reference_date date default current_date
)
returns integer
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  affected_count integer := 0;
  changed_count integer := 0;
begin
  if auth.uid() is null or not public.is_super_admin() then
    raise exception 'Somente o Super Admin pode atualizar vencimentos'
      using errcode = '42501';
  end if;

  update public.subscription_payments
  set status = 'overdue'
  where status = 'pending'
    and due_date < p_reference_date;
  get diagnostics changed_count = row_count;
  affected_count := affected_count + changed_count;

  update public.subscriptions s
  set
    status = case
      when s.grace_until is not null and s.grace_until < p_reference_date
        then 'grace_period'
      else 'overdue'
    end,
    updated_by = auth.uid()
  where s.status in ('pending', 'active', 'overdue')
    and exists (
      select 1
      from public.subscription_payments sp
      where sp.subscription_id = s.id
        and sp.status = 'overdue'
    );
  get diagnostics changed_count = row_count;
  affected_count := affected_count + changed_count;

  update public.organizations o
  set
    status = 'grace_period',
    subscription_status = s.status,
    active = true
  from public.subscriptions s
  where s.organization_id = o.id
    and s.status in ('overdue', 'grace_period')
    and (
      o.status is distinct from 'grace_period'
      or o.subscription_status is distinct from s.status
    );

  return affected_count;
end
$$;

revoke all on function public.admin_create_subscription(uuid, uuid, date, integer, numeric, text)
  from public;
revoke all on function public.admin_set_subscription_status(uuid, text, text)
  from public;
revoke all on function public.admin_create_subscription_payment(
  uuid, date, date, date, numeric, text
) from public;
revoke all on function public.admin_register_subscription_payment(
  uuid, timestamptz, numeric, text, text, text, text
) from public;
revoke all on function public.admin_refresh_subscription_statuses(date)
  from public;

grant execute on function public.admin_create_subscription(
  uuid, uuid, date, integer, numeric, text
) to authenticated;
grant execute on function public.admin_set_subscription_status(uuid, text, text)
  to authenticated;
grant execute on function public.admin_create_subscription_payment(
  uuid, date, date, date, numeric, text
) to authenticated;
grant execute on function public.admin_register_subscription_payment(
  uuid, timestamptz, numeric, text, text, text, text
) to authenticated;
grant execute on function public.admin_refresh_subscription_statuses(date)
  to authenticated;

comment on table public.plans is
  'Planos comerciais da plataforma Espaço+, preparados para cobrança manual ou gateway futuro.';
comment on table public.subscriptions is
  'Histórico de assinaturas das organizações, com um vínculo vigente por organização.';
comment on table public.subscription_payments is
  'Mensalidades e pagamentos das assinaturas administrados pelo Super Admin.';
comment on function public.admin_refresh_subscription_statuses(date) is
  'Atualiza manualmente mensalidades vencidas e o estado das assinaturas, sem cron ou gateway.';
