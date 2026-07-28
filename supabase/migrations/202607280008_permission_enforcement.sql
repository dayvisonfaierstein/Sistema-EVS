-- Fase 3: aplicação das permissões em RLS, operações e arquivos.

create or replace function public.has_any_permission(permission_keys text[])
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    public.is_super_admin()
    or public.is_organization_admin()
    or exists (
      select 1
      from unnest(coalesce(permission_keys, array[]::text[])) requested_permission
      where public.has_permission(requested_permission)
    ),
    false
  )
$$;

revoke all on function public.has_any_permission(text[]) from public;
grant execute on function public.has_any_permission(text[]) to authenticated;

-- Cria uma política permissiva para usuários personalizados e uma política
-- restritiva que torna a permissão obrigatória até para políticas antigas por perfil.
create or replace function public.apply_permission_policy(
  target_table text,
  operation_name text,
  permission_keys text[],
  allow_client_self_policy boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  permissive_name text := target_table || '_permission_' || lower(operation_name);
  boundary_name text := target_table || '_permission_boundary_' || lower(operation_name);
  permission_expression text := format(
    'public.has_any_permission(%L::text[])',
    permission_keys
  );
  boundary_expression text;
begin
  if to_regclass('public.' || target_table) is null then
    return;
  end if;

  if operation_name not in ('SELECT', 'INSERT', 'UPDATE') then
    raise exception 'Operação de política inválida';
  end if;

  boundary_expression := case
    when allow_client_self_policy and operation_name = 'SELECT'
      then '(' || permission_expression || ' or public.current_role() = ''client'')'
    else permission_expression
  end;

  execute format('drop policy if exists %I on public.%I', permissive_name, target_table);
  execute format('drop policy if exists %I on public.%I', boundary_name, target_table);

  if operation_name = 'SELECT' then
    execute format(
      'create policy %I on public.%I for select to authenticated using (%s)',
      permissive_name,
      target_table,
      permission_expression
    );
    execute format(
      'create policy %I on public.%I as restrictive for select to authenticated using (%s)',
      boundary_name,
      target_table,
      boundary_expression
    );
  elsif operation_name = 'INSERT' then
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (%s)',
      permissive_name,
      target_table,
      permission_expression
    );
    execute format(
      'create policy %I on public.%I as restrictive for insert to authenticated with check (%s)',
      boundary_name,
      target_table,
      boundary_expression
    );
  else
    execute format(
      'create policy %I on public.%I for update to authenticated using (%s) with check (%s)',
      permissive_name,
      target_table,
      permission_expression,
      permission_expression
    );
    execute format(
      'create policy %I on public.%I as restrictive for update to authenticated using (%s) with check (%s)',
      boundary_name,
      target_table,
      boundary_expression,
      boundary_expression
    );
  end if;
end
$$;

select public.apply_permission_policy('clients', 'SELECT', array['clients.view'], true);
select public.apply_permission_policy('clients', 'INSERT', array['clients.create']);
select public.apply_permission_policy('clients', 'UPDATE', array['clients.update', 'clients.deactivate']);

select public.apply_permission_policy(
  'client_health_information',
  'SELECT',
  array['clients.body_data.view']
);
select public.apply_permission_policy(
  'client_health_information',
  'INSERT',
  array['clients.create', 'clients.update']
);
select public.apply_permission_policy(
  'client_health_information',
  'UPDATE',
  array['clients.update']
);

select public.apply_permission_policy(
  'assessments',
  'SELECT',
  array['assessments.view'],
  true
);
select public.apply_permission_policy('assessments', 'INSERT', array['assessments.create']);
select public.apply_permission_policy('assessments', 'UPDATE', array['assessments.update']);

select public.apply_permission_policy(
  'client_goals',
  'SELECT',
  array['clients.body_data.view', 'assessments.view'],
  true
);
select public.apply_permission_policy(
  'client_goals',
  'INSERT',
  array['assessments.create', 'assessments.update']
);
select public.apply_permission_policy(
  'client_goals',
  'UPDATE',
  array['assessments.update']
);

select public.apply_permission_policy(
  'experience_plans',
  'SELECT',
  array['clients.view', 'accesses.view'],
  true
);
select public.apply_permission_policy(
  'experience_plans',
  'INSERT',
  array['clients.update', 'accesses.create']
);
select public.apply_permission_policy(
  'experience_plans',
  'UPDATE',
  array['clients.update', 'accesses.update']
);
select public.apply_permission_policy(
  'experience_plan_days',
  'SELECT',
  array['clients.view', 'accesses.view'],
  true
);
select public.apply_permission_policy(
  'experience_plan_days',
  'INSERT',
  array['clients.update', 'accesses.create']
);
select public.apply_permission_policy(
  'experience_plan_days',
  'UPDATE',
  array['clients.update', 'accesses.update']
);
select public.apply_permission_policy(
  'client_referrals',
  'SELECT',
  array['clients.view']
);
select public.apply_permission_policy(
  'client_referrals',
  'INSERT',
  array['clients.update']
);
select public.apply_permission_policy(
  'client_referrals',
  'UPDATE',
  array['clients.update']
);

select public.apply_permission_policy('accesses', 'SELECT', array['accesses.view'], true);
select public.apply_permission_policy('accesses', 'INSERT', array['accesses.create']);
select public.apply_permission_policy('accesses', 'UPDATE', array['accesses.update']);

select public.apply_permission_policy('appointments', 'SELECT', array['agenda.view']);
select public.apply_permission_policy('appointments', 'INSERT', array['agenda.create']);
select public.apply_permission_policy(
  'appointments',
  'UPDATE',
  array['agenda.update', 'agenda.cancel']
);

select public.apply_permission_policy('product_categories', 'SELECT', array['products.view']);
select public.apply_permission_policy('product_categories', 'INSERT', array['products.create']);
select public.apply_permission_policy('product_categories', 'UPDATE', array['products.update']);
select public.apply_permission_policy('products', 'SELECT', array['products.view']);
select public.apply_permission_policy('products', 'INSERT', array['products.create']);
select public.apply_permission_policy(
  'products',
  'UPDATE',
  array['products.update', 'products.deactivate', 'inventory.create', 'inventory.adjust',
        'inventory.loss', 'accesses.create', 'sales.create']
);
select public.apply_permission_policy(
  'product_reference_prices',
  'SELECT',
  array['products.view']
);
select public.apply_permission_policy(
  'product_reference_prices',
  'INSERT',
  array['products.create', 'products.update']
);
select public.apply_permission_policy(
  'product_reference_prices',
  'UPDATE',
  array['products.update']
);
select public.apply_permission_policy('product_pv_history', 'SELECT', array['products.view']);

select public.apply_permission_policy('product_batches', 'SELECT', array['inventory.view']);
select public.apply_permission_policy(
  'product_batches',
  'INSERT',
  array['inventory.create']
);
select public.apply_permission_policy(
  'product_batches',
  'UPDATE',
  array['inventory.create', 'inventory.adjust', 'inventory.loss',
        'accesses.create', 'sales.create']
);
select public.apply_permission_policy(
  'inventory_movements',
  'SELECT',
  array['inventory.view']
);
select public.apply_permission_policy(
  'inventory_movements',
  'INSERT',
  array['inventory.create', 'inventory.adjust', 'inventory.loss',
        'accesses.create', 'sales.create']
);

select public.apply_permission_policy('recipes', 'SELECT', array['recipes.view']);
select public.apply_permission_policy('recipes', 'INSERT', array['recipes.create']);
select public.apply_permission_policy(
  'recipes',
  'UPDATE',
  array['recipes.update', 'recipes.deactivate']
);
select public.apply_permission_policy('recipe_items', 'SELECT', array['recipes.view']);
select public.apply_permission_policy(
  'recipe_items',
  'INSERT',
  array['recipes.create', 'recipes.update']
);
select public.apply_permission_policy('recipe_items', 'UPDATE', array['recipes.update']);

select public.apply_permission_policy(
  'access_consumptions',
  'SELECT',
  array['accesses.view', 'reports.inventory'],
  true
);
select public.apply_permission_policy(
  'access_consumptions',
  'INSERT',
  array['accesses.create']
);
select public.apply_permission_policy(
  'consumption_items',
  'SELECT',
  array['accesses.view', 'reports.inventory'],
  true
);
select public.apply_permission_policy(
  'consumption_items',
  'INSERT',
  array['accesses.create']
);

select public.apply_permission_policy('sales', 'SELECT', array['sales.view']);
select public.apply_permission_policy('sales', 'INSERT', array['sales.create']);
select public.apply_permission_policy(
  'sales',
  'UPDATE',
  array['sales.create', 'sales.cancel', 'sales.discount']
);
select public.apply_permission_policy('sale_items', 'SELECT', array['sales.view']);
select public.apply_permission_policy('sale_items', 'INSERT', array['sales.create']);
select public.apply_permission_policy(
  'sale_items',
  'UPDATE',
  array['sales.create', 'sales.cancel']
);
select public.apply_permission_policy(
  'payments',
  'SELECT',
  array['sales.view', 'finance.receivables.view']
);
select public.apply_permission_policy(
  'payments',
  'INSERT',
  array['sales.create', 'finance.payments.register']
);
select public.apply_permission_policy(
  'payments',
  'UPDATE',
  array['sales.cancel', 'finance.payments.register']
);

select public.apply_permission_policy('financial_categories', 'SELECT', array['finance.view']);
select public.apply_permission_policy(
  'financial_categories',
  'INSERT',
  array['finance.income.create', 'finance.expense.create']
);
select public.apply_permission_policy(
  'financial_categories',
  'UPDATE',
  array['finance.entries.update']
);
select public.apply_permission_policy(
  'financial_entries',
  'SELECT',
  array['finance.income.view', 'finance.expense.view',
        'finance.payables.view', 'finance.receivables.view']
);
select public.apply_permission_policy(
  'financial_entries',
  'INSERT',
  array['finance.income.create', 'finance.expense.create']
);
select public.apply_permission_policy(
  'financial_entries',
  'UPDATE',
  array['finance.entries.update', 'finance.entries.cancel',
        'finance.payments.register']
);
select public.apply_permission_policy('cash_registers', 'SELECT', array['finance.cash.view']);
select public.apply_permission_policy('cash_registers', 'INSERT', array['finance.cash.open']);
select public.apply_permission_policy(
  'cash_registers',
  'UPDATE',
  array['finance.cash.close']
);
select public.apply_permission_policy('cash_movements', 'SELECT', array['finance.cash.view']);
select public.apply_permission_policy(
  'cash_movements',
  'INSERT',
  array['finance.cash.open', 'finance.cash.close', 'finance.payments.register']
);

select public.apply_permission_policy('events', 'SELECT', array['events.view']);
select public.apply_permission_policy('events', 'INSERT', array['events.create']);
select public.apply_permission_policy('events', 'UPDATE', array['events.update']);
select public.apply_permission_policy(
  'event_participants',
  'SELECT',
  array['events.view']
);
select public.apply_permission_policy(
  'event_participants',
  'INSERT',
  array['events.participants.manage']
);
select public.apply_permission_policy(
  'event_participants',
  'UPDATE',
  array['events.participants.manage']
);
select public.apply_permission_policy('campaigns', 'SELECT', array['campaigns.view']);
select public.apply_permission_policy('campaigns', 'INSERT', array['campaigns.create']);
select public.apply_permission_policy(
  'campaigns',
  'UPDATE',
  array['campaigns.update', 'campaigns.send']
);
select public.apply_permission_policy('audit_logs', 'SELECT', array['audit.view']);

-- Proteção de escrita executada também dentro de funções SECURITY DEFINER.
create or replace function public.enforce_write_permission()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  required_permissions text[];
  movement_type_value text;
begin
  if auth.uid() is null or public.is_super_admin() or public.is_organization_admin() then
    return new;
  end if;

  if tg_table_name = 'clients' then
    required_permissions := case when tg_op = 'INSERT'
      then array['clients.create'] else array['clients.update', 'clients.deactivate'] end;
  elsif tg_table_name = 'client_health_information' then
    required_permissions := array['clients.create', 'clients.update'];
  elsif tg_table_name in ('assessments', 'client_goals') then
    required_permissions := case when tg_op = 'INSERT'
      then array['assessments.create'] else array['assessments.update'] end;
  elsif tg_table_name in ('experience_plans', 'experience_plan_days') then
    required_permissions := case when tg_op = 'INSERT'
      then array['clients.update', 'accesses.create']
      else array['clients.update', 'accesses.update'] end;
  elsif tg_table_name = 'client_referrals' then
    required_permissions := array['clients.update'];
  elsif tg_table_name = 'accesses' then
    required_permissions := case when tg_op = 'INSERT'
      then array['accesses.create'] else array['accesses.update'] end;
  elsif tg_table_name = 'appointments' then
    required_permissions := case when tg_op = 'INSERT'
      then array['agenda.create'] else array['agenda.update', 'agenda.cancel'] end;
  elsif tg_table_name in ('product_categories', 'product_reference_prices') then
    required_permissions := case when tg_op = 'INSERT'
      then array['products.create'] else array['products.update'] end;
  elsif tg_table_name = 'products' then
    required_permissions := case when tg_op = 'INSERT'
      then array['products.create']
      else array['products.update', 'products.deactivate', 'inventory.create',
                 'inventory.adjust', 'inventory.loss', 'accesses.create', 'sales.create'] end;
  elsif tg_table_name = 'inventory_movements' then
    movement_type_value := new.movement_type;
    required_permissions := case
      when movement_type_value in ('loss', 'expiration') then array['inventory.loss']
      when movement_type_value in ('positive_adjustment', 'negative_adjustment')
        then array['inventory.adjust']
      when movement_type_value = 'consumption' then array['accesses.create', 'sales.create']
      else array['inventory.create']
    end;
  elsif tg_table_name = 'product_batches' then
    required_permissions := array['inventory.create', 'inventory.adjust', 'inventory.loss',
                                  'accesses.create', 'sales.create'];
  elsif tg_table_name in ('recipes', 'recipe_items') then
    required_permissions := case when tg_op = 'INSERT'
      then array['recipes.create'] else array['recipes.update', 'recipes.deactivate'] end;
  elsif tg_table_name in ('access_consumptions', 'consumption_items') then
    required_permissions := array['accesses.create'];
  elsif tg_table_name in ('sales', 'sale_items') then
    required_permissions := case when tg_op = 'INSERT'
      then array['sales.create'] else array['sales.create', 'sales.cancel', 'sales.discount'] end;
  elsif tg_table_name = 'payments' then
    required_permissions := array['sales.create', 'sales.cancel', 'finance.payments.register'];
  elsif tg_table_name = 'financial_categories' then
    required_permissions := case when tg_op = 'INSERT'
      then array['finance.income.create', 'finance.expense.create']
      else array['finance.entries.update'] end;
  elsif tg_table_name = 'financial_entries' then
    required_permissions := case when tg_op = 'INSERT'
      then array['finance.income.create', 'finance.expense.create']
      else array['finance.entries.update', 'finance.entries.cancel',
                 'finance.payments.register'] end;
  elsif tg_table_name = 'cash_registers' then
    required_permissions := case when tg_op = 'INSERT'
      then array['finance.cash.open'] else array['finance.cash.close'] end;
  elsif tg_table_name = 'cash_movements' then
    required_permissions := array['finance.cash.open', 'finance.cash.close',
                                  'finance.payments.register'];
  elsif tg_table_name = 'events' then
    required_permissions := case when tg_op = 'INSERT'
      then array['events.create'] else array['events.update'] end;
  elsif tg_table_name = 'event_participants' then
    required_permissions := array['events.participants.manage'];
  elsif tg_table_name = 'campaigns' then
    required_permissions := case when tg_op = 'INSERT'
      then array['campaigns.create'] else array['campaigns.update', 'campaigns.send'] end;
  else
    raise exception 'Operação não mapeada para autorização';
  end if;

  if not public.has_any_permission(required_permissions) then
    raise exception 'Seu usuário não possui permissão para realizar esta operação'
      using errcode = '42501';
  end if;

  return new;
end
$$;

do $$
declare
  protected_table text;
begin
  foreach protected_table in array array[
    'clients', 'client_health_information', 'assessments', 'client_goals',
    'experience_plans', 'experience_plan_days', 'client_referrals', 'accesses',
    'appointments', 'product_categories', 'products',
    'product_reference_prices', 'product_batches', 'inventory_movements',
    'recipes', 'recipe_items', 'access_consumptions', 'consumption_items',
    'sales', 'sale_items', 'payments', 'financial_categories',
    'financial_entries', 'cash_registers', 'cash_movements', 'events',
    'event_participants', 'campaigns'
  ]
  loop
    if to_regclass('public.' || protected_table) is not null then
      execute format(
        'drop trigger if exists enforce_write_permission on public.%I',
        protected_table
      );
      execute format(
        'create trigger enforce_write_permission
         before insert or update on public.%I
         for each row execute function public.enforce_write_permission()',
        protected_table
      );
    end if;
  end loop;
end
$$;

-- Arquivos também respeitam a capacidade do módulo, além da pasta da organização.
drop policy if exists storage_permission_read on storage.objects;
drop policy if exists storage_permission_boundary_read on storage.objects;
drop policy if exists storage_permission_write on storage.objects;
drop policy if exists storage_permission_boundary_write on storage.objects;
drop policy if exists storage_permission_update on storage.objects;
drop policy if exists storage_permission_boundary_update on storage.objects;
drop policy if exists storage_permission_delete on storage.objects;
drop policy if exists storage_permission_boundary_delete on storage.objects;

create policy storage_permission_read
on storage.objects for select to authenticated
using (
  case
    when bucket_id = 'client-photos' then public.has_permission('clients.view')
    when bucket_id = 'assessment-photos' then public.has_permission('assessments.photos.view')
    when bucket_id = 'commercial-images' then
      public.has_any_permission(array['products.view', 'recipes.view'])
    when bucket_id = 'event-images' then public.has_permission('events.view')
    when bucket_id = 'organization-logos' then public.has_permission('dashboard.view')
    when bucket_id = 'documents' then public.has_permission('settings.integrations')
    else public.is_super_admin()
  end
);

create policy storage_permission_boundary_read
on storage.objects as restrictive for select to authenticated
using (
  case
    when bucket_id = 'client-photos' then public.has_permission('clients.view')
    when bucket_id = 'assessment-photos' then public.has_permission('assessments.photos.view')
    when bucket_id = 'commercial-images' then
      public.has_any_permission(array['products.view', 'recipes.view'])
    when bucket_id = 'event-images' then public.has_permission('events.view')
    when bucket_id = 'organization-logos' then public.has_permission('dashboard.view')
    when bucket_id = 'documents' then public.has_permission('settings.integrations')
    else public.is_super_admin()
  end
);

create policy storage_permission_write
on storage.objects for insert to authenticated
with check (
  case
    when bucket_id = 'client-photos' then
      public.has_any_permission(array['clients.create', 'clients.update'])
    when bucket_id = 'assessment-photos' then
      public.has_any_permission(array['assessments.create', 'assessments.update'])
    when bucket_id = 'commercial-images' then
      public.has_any_permission(array['products.create', 'products.update',
                                      'recipes.create', 'recipes.update'])
    when bucket_id = 'event-images' then
      public.has_any_permission(array['events.create', 'events.update'])
    when bucket_id = 'organization-logos' then
      public.has_permission('settings.organization')
    when bucket_id = 'documents' then public.has_permission('settings.integrations')
    else public.is_super_admin()
  end
);

create policy storage_permission_boundary_write
on storage.objects as restrictive for insert to authenticated
with check (
  case
    when bucket_id = 'client-photos' then
      public.has_any_permission(array['clients.create', 'clients.update'])
    when bucket_id = 'assessment-photos' then
      public.has_any_permission(array['assessments.create', 'assessments.update'])
    when bucket_id = 'commercial-images' then
      public.has_any_permission(array['products.create', 'products.update',
                                      'recipes.create', 'recipes.update'])
    when bucket_id = 'event-images' then
      public.has_any_permission(array['events.create', 'events.update'])
    when bucket_id = 'organization-logos' then
      public.has_permission('settings.organization')
    when bucket_id = 'documents' then public.has_permission('settings.integrations')
    else public.is_super_admin()
  end
);

create policy storage_permission_update
on storage.objects for update to authenticated
using (
  case
    when bucket_id = 'client-photos' then public.has_permission('clients.update')
    when bucket_id = 'assessment-photos' then public.has_permission('assessments.update')
    when bucket_id = 'commercial-images' then
      public.has_any_permission(array['products.update', 'recipes.update'])
    when bucket_id = 'event-images' then public.has_permission('events.update')
    when bucket_id = 'organization-logos' then
      public.has_permission('settings.organization')
    when bucket_id = 'documents' then public.has_permission('settings.integrations')
    else public.is_super_admin()
  end
)
with check (
  case
    when bucket_id = 'client-photos' then public.has_permission('clients.update')
    when bucket_id = 'assessment-photos' then public.has_permission('assessments.update')
    when bucket_id = 'commercial-images' then
      public.has_any_permission(array['products.update', 'recipes.update'])
    when bucket_id = 'event-images' then public.has_permission('events.update')
    when bucket_id = 'organization-logos' then
      public.has_permission('settings.organization')
    when bucket_id = 'documents' then public.has_permission('settings.integrations')
    else public.is_super_admin()
  end
);

create policy storage_permission_boundary_update
on storage.objects as restrictive for update to authenticated
using (
  case
    when bucket_id = 'client-photos' then public.has_permission('clients.update')
    when bucket_id = 'assessment-photos' then public.has_permission('assessments.update')
    when bucket_id = 'commercial-images' then
      public.has_any_permission(array['products.update', 'recipes.update'])
    when bucket_id = 'event-images' then public.has_permission('events.update')
    when bucket_id = 'organization-logos' then
      public.has_permission('settings.organization')
    when bucket_id = 'documents' then public.has_permission('settings.integrations')
    else public.is_super_admin()
  end
)
with check (
  case
    when bucket_id = 'client-photos' then public.has_permission('clients.update')
    when bucket_id = 'assessment-photos' then public.has_permission('assessments.update')
    when bucket_id = 'commercial-images' then
      public.has_any_permission(array['products.update', 'recipes.update'])
    when bucket_id = 'event-images' then public.has_permission('events.update')
    when bucket_id = 'organization-logos' then
      public.has_permission('settings.organization')
    when bucket_id = 'documents' then public.has_permission('settings.integrations')
    else public.is_super_admin()
  end
);

create policy storage_permission_delete
on storage.objects for delete to authenticated
using (
  case
    when bucket_id = 'client-photos' then public.has_permission('clients.update')
    when bucket_id = 'assessment-photos' then public.has_permission('assessments.update')
    when bucket_id = 'commercial-images' then
      public.has_any_permission(array['products.update', 'recipes.update'])
    when bucket_id = 'event-images' then public.has_permission('events.update')
    when bucket_id = 'organization-logos' then
      public.has_permission('settings.organization')
    when bucket_id = 'documents' then public.has_permission('settings.integrations')
    else public.is_super_admin()
  end
);

create policy storage_permission_boundary_delete
on storage.objects as restrictive for delete to authenticated
using (
  case
    when bucket_id = 'client-photos' then public.has_permission('clients.update')
    when bucket_id = 'assessment-photos' then public.has_permission('assessments.update')
    when bucket_id = 'commercial-images' then
      public.has_any_permission(array['products.update', 'recipes.update'])
    when bucket_id = 'event-images' then public.has_permission('events.update')
    when bucket_id = 'organization-logos' then
      public.has_permission('settings.organization')
    when bucket_id = 'documents' then public.has_permission('settings.integrations')
    else public.is_super_admin()
  end
);

revoke all on function public.apply_permission_policy(text, text, text[], boolean)
from public, authenticated;
drop function public.apply_permission_policy(text, text, text[], boolean);

comment on function public.enforce_write_permission() is
  'Bloqueia gravações sem permissão, inclusive dentro de funções SECURITY DEFINER.';
