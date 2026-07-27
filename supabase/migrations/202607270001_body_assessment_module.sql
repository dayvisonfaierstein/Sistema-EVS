alter table public.clients
  add column if not exists height numeric check (height between .5 and 2.8);

alter table public.assessments
  add column if not exists age_at_assessment integer check (age_at_assessment between 0 and 130),
  add column if not exists evaluator_name text,
  add column if not exists bmi_classification text,
  add column if not exists muscle_percentage numeric check (muscle_percentage between 0 and 100),
  add column if not exists subcutaneous_fat_percentage numeric
    check (subcutaneous_fat_percentage between 0 and 100),
  add column if not exists fat_mass numeric check (fat_mass >= 0),
  add column if not exists fat_free_mass numeric check (fat_free_mass >= 0),
  add column if not exists objectives text[] not null default '{}',
  add column if not exists goal_weight numeric check (goal_weight > 0),
  add column if not exists desired_weight_change numeric,
  add column if not exists previous_attempts text,
  add column if not exists previous_attempt_failure_reason text,
  add column if not exists motivation text,
  add column if not exists initial_notes text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'assessments_body_fat_percentage_check'
      and conrelid = 'public.assessments'::regclass
  ) then
    alter table public.assessments
      add constraint assessments_body_fat_percentage_check
      check (body_fat_percentage is null or body_fat_percentage between 0 and 100);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'assessments_body_water_percentage_check'
      and conrelid = 'public.assessments'::regclass
  ) then
    alter table public.assessments
      add constraint assessments_body_water_percentage_check
      check (body_water_percentage is null or body_water_percentage between 0 and 100);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'assessments_protein_percentage_check'
      and conrelid = 'public.assessments'::regclass
  ) then
    alter table public.assessments
      add constraint assessments_protein_percentage_check
      check (protein_percentage is null or protein_percentage between 0 and 100);
  end if;
end $$;

create index if not exists assessments_client_date_idx
  on public.assessments(client_id, assessment_date desc, created_at desc);

create table if not exists public.experience_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  client_id uuid not null references public.clients(id),
  started_at date not null default current_date,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.experience_plan_days (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  plan_id uuid not null references public.experience_plans(id) on delete cascade,
  day_number integer not null check (day_number between 1 and 3),
  plan_date date not null,
  breakfast text,
  lunch text,
  dinner text,
  notes text,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(plan_id, day_number)
);

create table if not exists public.client_referrals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  referring_client_id uuid not null references public.clients(id),
  name text not null,
  phone text,
  city text,
  relationship text,
  status text not null default 'new',
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists experience_plans_client_idx
  on public.experience_plans(client_id, started_at desc);
create index if not exists client_referrals_referrer_idx
  on public.client_referrals(referring_client_id, created_at desc);

drop trigger if exists set_updated_at on public.experience_plans;
create trigger set_updated_at before update on public.experience_plans
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.experience_plan_days;
create trigger set_updated_at before update on public.experience_plan_days
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.client_referrals;
create trigger set_updated_at before update on public.client_referrals
  for each row execute function public.set_updated_at();

alter table public.experience_plans enable row level security;
alter table public.experience_plan_days enable row level security;
alter table public.client_referrals enable row level security;

drop policy if exists experience_plans_org_access on public.experience_plans;
create policy experience_plans_org_access on public.experience_plans
  for all
  using (
    (organization_id = public.current_organization_id()
      and public.current_role()::text in ('administrator', 'attendant', 'evaluator'))
    or public.current_role() = 'super_admin'
  )
  with check (
    (organization_id = public.current_organization_id()
      and public.current_role()::text in ('administrator', 'attendant', 'evaluator'))
    or public.current_role() = 'super_admin'
  );

drop policy if exists experience_plan_days_org_access on public.experience_plan_days;
create policy experience_plan_days_org_access on public.experience_plan_days
  for all
  using (
    (organization_id = public.current_organization_id()
      and public.current_role()::text in ('administrator', 'attendant', 'evaluator'))
    or public.current_role() = 'super_admin'
  )
  with check (
    (organization_id = public.current_organization_id()
      and public.current_role()::text in ('administrator', 'attendant', 'evaluator'))
    or public.current_role() = 'super_admin'
  );

drop policy if exists client_referrals_org_access on public.client_referrals;
create policy client_referrals_org_access on public.client_referrals
  for all
  using (
    (organization_id = public.current_organization_id()
      and public.current_role()::text in ('administrator', 'attendant', 'evaluator'))
    or public.current_role() = 'super_admin'
  )
  with check (
    (organization_id = public.current_organization_id()
      and public.current_role()::text in ('administrator', 'attendant', 'evaluator'))
    or public.current_role() = 'super_admin'
  );

drop policy if exists experience_plans_client_read on public.experience_plans;
create policy experience_plans_client_read on public.experience_plans
  for select using (client_id = public.current_client_id());

drop policy if exists experience_plan_days_client_read on public.experience_plan_days;
create policy experience_plan_days_client_read on public.experience_plan_days
  for select using (
    exists (
      select 1 from public.experience_plans
      where experience_plans.id = experience_plan_days.plan_id
        and experience_plans.client_id = public.current_client_id()
    )
  );
