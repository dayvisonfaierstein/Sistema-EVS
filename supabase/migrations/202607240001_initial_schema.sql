create extension if not exists pgcrypto;

create type public.user_role as enum ('super_admin','administrator','attendant','evaluator','finance','inventory','client');
create type public.client_status as enum ('active','inactive','new');

create table public.organizations (
  id uuid primary key default gen_random_uuid(), legal_name text not null, trade_name text not null,
  document text, phone text, whatsapp text, email text, address text, city text, state text,
  postal_code text, logo_url text, primary_color text, secondary_color text,
  subscription_status text not null default 'trial', active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id), full_name text not null, email text not null,
  phone text, avatar_url text, role public.user_role not null default 'client', active boolean not null default true,
  last_access_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  profile_id uuid references public.profiles(id), full_name text not null, cpf text, birth_date date, gender text,
  phone text, whatsapp text, email text, profession text, emergency_contact_name text,
  emergency_contact_phone text, address text, city text, state text, postal_code text, photo_url text,
  primary_goal text, status public.client_status not null default 'new', registration_date date not null default current_date,
  last_visit_at timestamptz, notes text, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), created_by uuid references public.profiles(id),
  unique (organization_id, cpf), unique (organization_id, profile_id)
);

create table public.client_health_information (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  client_id uuid not null unique references public.clients(id), physical_activity text, activity_frequency text,
  water_intake numeric, sleep_hours numeric, dietary_restrictions text, allergies text, medications text,
  reported_health_conditions text, habits text, observations text, consent_accepted boolean not null default false,
  consent_version text, consent_date timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.assessments (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  client_id uuid not null references public.clients(id), assessment_date date not null default current_date,
  weight numeric check (weight between 20 and 400), height numeric check (height between .5 and 2.8),
  bmi numeric generated always as (case when height > 0 and weight is not null then round(weight/(height*height),2) end) stored,
  body_fat_percentage numeric, muscle_mass numeric, lean_mass numeric, body_water_percentage numeric,
  visceral_fat numeric, bone_mass numeric, protein_percentage numeric, basal_metabolic_rate numeric,
  metabolic_age numeric, waist numeric, abdomen numeric, hip numeric, chest numeric, right_arm numeric,
  left_arm numeric, right_thigh numeric, left_thigh numeric, right_calf numeric, left_calf numeric,
  front_photo_url text, side_photo_url text, back_photo_url text, observations text,
  evaluator_id uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.client_goals (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  client_id uuid not null references public.clients(id), goal_type text not null, initial_value numeric,
  target_value numeric, current_value numeric, unit text, start_date date not null default current_date,
  target_date date, completed_at timestamptz, status text not null default 'active', notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.accesses (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  client_id uuid not null references public.clients(id), accessed_at timestamptz not null default now(),
  attendant_id uuid references public.profiles(id), access_type text not null default 'visit',
  consumed_products_notes text, service_performed text, notes text, created_at timestamptz not null default now()
);
create index accesses_client_time_idx on public.accesses(client_id, accessed_at desc);

create table public.appointments (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  client_id uuid references public.clients(id), title text not null, appointment_type text not null,
  start_at timestamptz not null, end_at timestamptz not null, professional_id uuid references public.profiles(id),
  status text not null default 'scheduled', notes text, reminder_sent_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  name text not null, document text, contact_name text, phone text, whatsapp text, email text, address text,
  notes text, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.product_categories (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  name text not null, description text, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id,name)
);
create table public.products (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  category_id uuid references public.product_categories(id), name text not null, description text, brand text,
  sku text, barcode text, unit text not null default 'unit', photo_url text, cost_price numeric not null default 0,
  sale_price numeric not null default 0, minimum_stock numeric not null default 0, current_stock numeric not null default 0,
  track_batches boolean not null default true, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id,sku)
);
create table public.product_batches (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  product_id uuid not null references public.products(id), supplier_id uuid references public.suppliers(id),
  batch_number text not null, manufacture_date date, expiration_date date, initial_quantity numeric not null,
  current_quantity numeric not null, unit_cost numeric not null, received_at timestamptz not null default now(),
  status text not null default 'active', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  product_id uuid not null references public.products(id), batch_id uuid references public.product_batches(id),
  movement_type text not null, quantity numeric not null, previous_balance numeric not null, new_balance numeric not null,
  reason text, reference_type text, reference_id uuid, user_id uuid references public.profiles(id), created_at timestamptz not null default now()
);

create table public.sales (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  client_id uuid references public.clients(id), seller_id uuid references public.profiles(id), sale_date timestamptz not null default now(),
  subtotal numeric not null, discount numeric not null default 0, total numeric not null, cost_total numeric not null,
  estimated_profit numeric not null, status text not null default 'draft', notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.sale_items (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  sale_id uuid not null references public.sales(id) on delete cascade, product_id uuid not null references public.products(id),
  batch_id uuid references public.product_batches(id), quantity numeric not null, unit_price numeric not null,
  unit_cost numeric not null, discount numeric not null default 0, total numeric not null, created_at timestamptz not null default now()
);
create table public.payments (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  sale_id uuid not null references public.sales(id), payment_method text not null, amount numeric not null,
  installments int not null default 1, status text not null default 'pending', paid_at timestamptz, due_date date,
  transaction_reference text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.cash_registers (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  opened_by uuid not null references public.profiles(id), opened_at timestamptz not null default now(), opening_amount numeric not null,
  closed_by uuid references public.profiles(id), closed_at timestamptz, closing_amount numeric, expected_amount numeric,
  difference_amount numeric, status text not null default 'open', notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.cash_movements (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  cash_register_id uuid not null references public.cash_registers(id), movement_type text not null, category text,
  description text not null, amount numeric not null, payment_method text, sale_id uuid references public.sales(id),
  user_id uuid references public.profiles(id), created_at timestamptz not null default now()
);
create table public.financial_categories (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  name text not null, entry_type text not null, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.financial_entries (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  category_id uuid references public.financial_categories(id), entry_type text not null, description text not null,
  amount numeric not null, due_date date, payment_date date, status text not null default 'pending', payment_method text,
  sale_id uuid references public.sales(id), supplier_id uuid references public.suppliers(id), recurring boolean not null default false,
  recurrence_rule text, notes text, created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  title text not null, description text, image_url text, location text, start_at timestamptz not null, end_at timestamptz,
  maximum_participants int, registration_required boolean not null default false, status text not null default 'draft',
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.event_participants (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  event_id uuid not null references public.events(id), client_id uuid not null references public.clients(id),
  confirmation_status text not null default 'pending', confirmed_at timestamptz, check_in_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(event_id,client_id)
);
create table public.campaigns (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  title text not null, campaign_type text not null, message text not null, target_filter jsonb,
  scheduled_at timestamptz, sent_at timestamptz, status text not null default 'draft',
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  client_id uuid references public.clients(id), profile_id uuid references public.profiles(id), title text not null,
  message text not null, notification_type text, reference_type text, reference_id uuid, read_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id),
  user_id uuid references public.profiles(id), action text not null, entity text not null, entity_id uuid,
  old_data jsonb, new_data jsonb, created_at timestamptz not null default now()
);

create or replace function public.current_profile() returns public.profiles language sql stable security definer set search_path=public
as $$ select * from public.profiles where id=auth.uid() and active limit 1 $$;
create or replace function public.current_organization_id() returns uuid language sql stable security definer set search_path=public
as $$ select organization_id from public.profiles where id=auth.uid() and active $$;
create or replace function public.current_role() returns public.user_role language sql stable security definer set search_path=public
as $$ select role from public.profiles where id=auth.uid() and active $$;
create or replace function public.current_client_id() returns uuid language sql stable security definer set search_path=public
as $$ select id from public.clients where profile_id=auth.uid() limit 1 $$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public
as $$ select coalesce(public.current_role() in ('super_admin','administrator'),false) $$;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end $$;
do $$ declare t text; begin foreach t in array array['organizations','profiles','clients','client_health_information','assessments','client_goals','appointments','suppliers','product_categories','products','product_batches','sales','payments','cash_registers','financial_categories','financial_entries','events','event_participants','campaigns']
loop execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',t); end loop; end $$;

create or replace function public.register_client_access(p_client_id uuid, p_access_type text, p_service_performed text default null, p_notes text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid; org uuid:=public.current_organization_id();
begin
  if org is null then raise exception 'unauthorized'; end if;
  perform pg_advisory_xact_lock(hashtext(p_client_id::text));
  if exists(select 1 from accesses where accesses.client_id=p_client_id and accessed_at > now()-interval '60 seconds')
    then raise exception 'Acesso já registrado no último minuto'; end if;
  insert into public.accesses(organization_id,client_id,attendant_id,access_type,service_performed,notes)
  select org,clients.id,auth.uid(),p_access_type,p_service_performed,p_notes from clients where id=p_client_id and organization_id=org
  returning id into result;
  update clients set last_visit_at=now() where id=p_client_id and organization_id=org;
  return result;
end $$;

do $$ declare t text; begin foreach t in array array['organizations','profiles','clients','client_health_information','assessments','client_goals','accesses','appointments','suppliers','product_categories','products','product_batches','inventory_movements','sales','sale_items','payments','cash_registers','cash_movements','financial_categories','financial_entries','events','event_participants','campaigns','notifications','audit_logs']
loop execute format('alter table public.%I enable row level security',t); end loop; end $$;

create policy organizations_read on public.organizations for select using (id=public.current_organization_id() or public.current_role()='super_admin');
create policy profiles_org_read on public.profiles for select using (organization_id=public.current_organization_id() or id=auth.uid() or public.current_role()='super_admin');
create policy profiles_admin_write on public.profiles for all using (public.is_admin()) with check (public.is_admin());

do $$ declare t text; roles text; begin foreach t in array array['clients','client_health_information','assessments','client_goals','accesses','appointments','suppliers','product_categories','products','product_batches','inventory_movements','sales','sale_items','payments','cash_registers','cash_movements','financial_categories','financial_entries','events','event_participants','campaigns','notifications','audit_logs']
loop
roles := case
  when t in ('client_health_information','assessments','client_goals') then '''administrator'',''attendant'',''evaluator'''
  when t in ('suppliers','product_categories','products','product_batches','inventory_movements') then '''administrator'',''attendant'',''inventory'''
  when t in ('sales','sale_items','payments') then '''administrator'',''attendant'',''finance'''
  when t in ('cash_registers','cash_movements','financial_categories','financial_entries') then '''administrator'',''finance'''
  when t='audit_logs' then '''administrator'''
  else '''administrator'',''attendant'',''evaluator'',''finance'',''inventory'''
end;
execute format('create policy %I_org_select on public.%I for select using ((organization_id=public.current_organization_id() and public.current_role()::text in (%s)) or public.current_role()=''super_admin'')',t,t,roles);
execute format('create policy %I_org_insert on public.%I for insert with check ((organization_id=public.current_organization_id() and public.current_role()::text in (%s)) or public.current_role()=''super_admin'')',t,t,roles);
execute format('create policy %I_org_update on public.%I for update using ((organization_id=public.current_organization_id() and public.current_role()::text in (%s)) or public.current_role()=''super_admin'') with check ((organization_id=public.current_organization_id() and public.current_role()::text in (%s)) or public.current_role()=''super_admin'')',t,t,roles,roles);
end loop; end $$;

create policy clients_self_read on public.clients for select using (id=public.current_client_id());
create policy assessments_client_read on public.assessments for select using (client_id=public.current_client_id());
create policy accesses_client_read on public.accesses for select using (client_id=public.current_client_id());
create policy goals_client_read on public.client_goals for select using (client_id=public.current_client_id());
create policy notifications_client_read on public.notifications for select using (client_id=public.current_client_id() or profile_id=auth.uid());

insert into storage.buckets(id,name,public) values
('organization-logos','organization-logos',false),('client-photos','client-photos',false),
('assessment-photos','assessment-photos',false),('event-images','event-images',false),('documents','documents',false)
on conflict(id) do nothing;
create policy storage_org_read on storage.objects for select using (
  bucket_id in ('organization-logos','client-photos','assessment-photos','event-images','documents')
  and (storage.foldername(name))[1]=public.current_organization_id()::text
);
create policy storage_org_write on storage.objects for insert with check (
  bucket_id in ('organization-logos','client-photos','assessment-photos','event-images','documents')
  and (storage.foldername(name))[1]=public.current_organization_id()::text
  and public.current_role()<>'client'
);
