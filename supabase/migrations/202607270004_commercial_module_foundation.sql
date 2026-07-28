-- Fundação do módulo comercial do Espaço+.
-- Evolui as tabelas comerciais criadas no schema inicial sem perder dados.

alter type public.user_role add value if not exists 'manager';

alter table public.products
  add column if not exists subcategory text,
  add column if not exists notes text,
  add column if not exists package_content numeric(18,6),
  add column if not exists content_unit text,
  add column if not exists stock_unit text not null default 'unit',
  add column if not exists consumption_unit text not null default 'unit',
  add column if not exists volume_points numeric(18,6),
  add column if not exists pv_last_updated_at timestamptz,
  add column if not exists average_cost numeric(14,6) not null default 0,
  add column if not exists verification_status text not null default 'pending',
  add column if not exists source_name text,
  add column if not exists source_url text,
  add column if not exists source_reference_date date;

update public.products
set
  stock_unit = unit,
  consumption_unit = unit
where stock_unit = 'unit'
  and consumption_unit = 'unit'
  and unit <> 'unit';

alter table public.products
  alter column cost_price type numeric(14,6),
  alter column sale_price type numeric(14,2),
  alter column minimum_stock type numeric(18,6),
  alter column current_stock type numeric(18,6);

alter table public.products
  drop constraint if exists products_package_content_positive,
  add constraint products_package_content_positive
    check (package_content is null or package_content > 0) not valid,
  drop constraint if exists products_volume_points_nonnegative,
  add constraint products_volume_points_nonnegative
    check (volume_points is null or volume_points >= 0) not valid,
  drop constraint if exists products_stock_nonnegative,
  add constraint products_stock_nonnegative
    check (current_stock >= 0 and minimum_stock >= 0) not valid,
  drop constraint if exists products_verification_status_valid,
  add constraint products_verification_status_valid
    check (verification_status in ('pending', 'verified', 'updated')) not valid;

alter table public.product_batches
  add column if not exists package_quantity numeric(18,6),
  add column if not exists package_unit text,
  add column if not exists consumption_unit text,
  add column if not exists notes text;

alter table public.product_batches
  alter column initial_quantity type numeric(18,6),
  alter column current_quantity type numeric(18,6),
  alter column unit_cost type numeric(14,6);

alter table public.product_batches
  drop constraint if exists product_batches_quantities_nonnegative,
  add constraint product_batches_quantities_nonnegative
    check (
      initial_quantity >= 0
      and current_quantity >= 0
      and (package_quantity is null or package_quantity > 0)
    ) not valid;

alter table public.inventory_movements
  add column if not exists unit text,
  add column if not exists notes text,
  add column if not exists access_id uuid references public.accesses(id);

alter table public.inventory_movements
  alter column quantity type numeric(18,6),
  alter column previous_balance type numeric(18,6),
  alter column new_balance type numeric(18,6);

create table if not exists public.product_reference_prices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  product_id uuid not null references public.products(id),
  state_code text not null,
  reference_date date not null,
  gross_price numeric(14,2),
  earnings_base numeric(14,2),
  price_25 numeric(14,2),
  price_35 numeric(14,2),
  price_42 numeric(14,2),
  price_50 numeric(14,2),
  source_name text,
  source_url text,
  imported_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, product_id, state_code, reference_date),
  check (state_code ~ '^[A-Z]{2}$')
);

create table if not exists public.product_pv_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  product_id uuid not null references public.products(id),
  volume_points numeric(18,6) not null check (volume_points >= 0),
  effective_from timestamptz not null default now(),
  changed_by uuid references public.profiles(id),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists product_pv_history_product_date_idx
  on public.product_pv_history(product_id, effective_from desc);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  name text not null,
  category text,
  description text,
  photo_url text,
  sale_price numeric(14,2) not null default 0 check (sale_price >= 0),
  active boolean not null default true,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity numeric(18,6) not null check (quantity > 0),
  unit text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (recipe_id, product_id)
);

create table if not exists public.access_consumptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  access_id uuid not null references public.accesses(id),
  client_id uuid not null references public.clients(id),
  consumption_type text not null check (consumption_type in ('recipe', 'product')),
  recipe_id uuid references public.recipes(id),
  direct_product_id uuid references public.products(id),
  item_name_snapshot text not null,
  quantity numeric(18,6) not null default 1 check (quantity > 0),
  sale_price_snapshot numeric(14,2) not null default 0,
  cost_total numeric(14,6) not null default 0,
  pv_total numeric(18,6) not null default 0,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (
    (consumption_type = 'recipe' and recipe_id is not null and direct_product_id is null)
    or
    (consumption_type = 'product' and direct_product_id is not null and recipe_id is null)
  )
);

create table if not exists public.consumption_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  access_consumption_id uuid not null references public.access_consumptions(id) on delete cascade,
  product_id uuid references public.products(id),
  batch_id uuid references public.product_batches(id),
  inventory_movement_id uuid references public.inventory_movements(id),
  product_name_snapshot text not null,
  sku_snapshot text,
  quantity numeric(18,6) not null check (quantity > 0),
  unit text not null,
  unit_cost_snapshot numeric(14,6) not null default 0,
  cost_total numeric(14,6) not null default 0,
  unit_pv_snapshot numeric(18,9) not null default 0,
  pv_total numeric(18,6) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists product_reference_prices_product_idx
  on public.product_reference_prices(product_id, state_code, reference_date desc);
create index if not exists product_batches_fefo_idx
  on public.product_batches(product_id, expiration_date, received_at)
  where status = 'active' and current_quantity > 0;
create index if not exists inventory_movements_product_date_idx
  on public.inventory_movements(product_id, created_at desc);
create index if not exists recipe_items_recipe_idx
  on public.recipe_items(recipe_id, sort_order);
create index if not exists access_consumptions_access_idx
  on public.access_consumptions(access_id, created_at);
create index if not exists access_consumptions_client_idx
  on public.access_consumptions(client_id, created_at desc);
create index if not exists consumption_items_consumption_idx
  on public.consumption_items(access_consumption_id);

drop trigger if exists set_updated_at on public.product_reference_prices;
create trigger set_updated_at
  before update on public.product_reference_prices
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.recipes;
create trigger set_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.recipe_items;
create trigger set_updated_at
  before update on public.recipe_items
  for each row execute function public.set_updated_at();

create or replace function public.record_product_pv_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.volume_points is distinct from old.volume_points and new.volume_points is not null then
    new.pv_last_updated_at := now();
    insert into public.product_pv_history (
      organization_id,
      product_id,
      volume_points,
      effective_from,
      changed_by
    )
    values (
      new.organization_id,
      new.id,
      new.volume_points,
      now(),
      auth.uid()
    );
  end if;
  return new;
end;
$$;

drop trigger if exists record_product_pv_history on public.products;
create trigger record_product_pv_history
  before update of volume_points on public.products
  for each row execute function public.record_product_pv_history();

create or replace function public.record_initial_product_pv_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.volume_points is not null then
    insert into public.product_pv_history (
      organization_id,
      product_id,
      volume_points,
      effective_from,
      changed_by
    )
    values (
      new.organization_id,
      new.id,
      new.volume_points,
      coalesce(new.pv_last_updated_at, now()),
      auth.uid()
    );
  end if;
  return new;
end;
$$;

drop trigger if exists record_initial_product_pv_history on public.products;
create trigger record_initial_product_pv_history
  after insert on public.products
  for each row execute function public.record_initial_product_pv_history();

insert into public.product_pv_history (
  organization_id,
  product_id,
  volume_points,
  effective_from
)
select
  p.organization_id,
  p.id,
  p.volume_points,
  coalesce(p.pv_last_updated_at, p.updated_at, p.created_at)
from public.products p
where p.volume_points is not null
  and not exists (
    select 1
    from public.product_pv_history h
    where h.product_id = p.id
  );

create or replace function public.seed_default_product_categories()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.product_categories (organization_id, name)
  select new.id, category_name
  from unnest(array[
    'Shakes',
    'Proteínas',
    'Chás e Bebidas',
    'Fibras',
    'Suplementos',
    'Nutrição Esportiva',
    'Barras e Snacks',
    'Sopas e Alimentos',
    'Cuidados Pessoais',
    'Outros'
  ]) as category_name
  on conflict (organization_id, name) do nothing;
  return new;
end;
$$;

drop trigger if exists seed_default_product_categories on public.organizations;
create trigger seed_default_product_categories
  after insert on public.organizations
  for each row execute function public.seed_default_product_categories();

insert into public.product_categories (organization_id, name)
select o.id, c.category_name
from public.organizations o
cross join unnest(array[
  'Shakes',
  'Proteínas',
  'Chás e Bebidas',
  'Fibras',
  'Suplementos',
  'Nutrição Esportiva',
  'Barras e Snacks',
  'Sopas e Alimentos',
  'Cuidados Pessoais',
  'Outros'
]) as c(category_name)
on conflict (organization_id, name) do nothing;

alter table public.product_reference_prices enable row level security;
alter table public.product_pv_history enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_items enable row level security;
alter table public.access_consumptions enable row level security;
alter table public.consumption_items enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'suppliers',
    'product_categories',
    'products',
    'product_batches',
    'inventory_movements'
  ]
  loop
    execute format('drop policy if exists %I_org_select on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_org_insert on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_org_update on public.%I', table_name, table_name);

    execute format(
      'create policy %I_org_select on public.%I for select using (
        (organization_id = public.current_organization_id()
          and public.current_role()::text in (
            ''administrator'', ''manager'', ''attendant'', ''finance'', ''inventory''
          ))
        or public.current_role() = ''super_admin''
      )',
      table_name,
      table_name
    );

    execute format(
      'create policy %I_org_insert on public.%I for insert with check (
        (organization_id = public.current_organization_id()
          and public.current_role()::text in (''administrator'', ''manager'', ''inventory''))
        or public.current_role() = ''super_admin''
      )',
      table_name,
      table_name
    );

    execute format(
      'create policy %I_org_update on public.%I for update using (
        (organization_id = public.current_organization_id()
          and public.current_role()::text in (''administrator'', ''manager'', ''inventory''))
        or public.current_role() = ''super_admin''
      ) with check (
        (organization_id = public.current_organization_id()
          and public.current_role()::text in (''administrator'', ''manager'', ''inventory''))
        or public.current_role() = ''super_admin''
      )',
      table_name,
      table_name
    );
  end loop;
end;
$$;

drop policy if exists product_reference_prices_org_select on public.product_reference_prices;
create policy product_reference_prices_org_select
  on public.product_reference_prices for select
  using (
    (organization_id = public.current_organization_id()
      and public.current_role()::text in ('administrator', 'manager', 'attendant', 'finance', 'inventory'))
    or public.current_role() = 'super_admin'
  );

drop policy if exists product_reference_prices_org_write on public.product_reference_prices;
drop policy if exists product_reference_prices_org_insert on public.product_reference_prices;
create policy product_reference_prices_org_insert
  on public.product_reference_prices for insert
  with check (
    (organization_id = public.current_organization_id()
      and public.current_role()::text in ('administrator', 'manager', 'inventory'))
    or public.current_role() = 'super_admin'
  );

drop policy if exists product_reference_prices_org_update on public.product_reference_prices;
create policy product_reference_prices_org_update
  on public.product_reference_prices for update
  using (
    (organization_id = public.current_organization_id()
      and public.current_role()::text in ('administrator', 'manager', 'inventory'))
    or public.current_role() = 'super_admin'
  )
  with check (
    (organization_id = public.current_organization_id()
      and public.current_role()::text in ('administrator', 'manager', 'inventory'))
    or public.current_role() = 'super_admin'
  );

drop policy if exists product_pv_history_org_select on public.product_pv_history;
create policy product_pv_history_org_select
  on public.product_pv_history for select
  using (
    (organization_id = public.current_organization_id()
      and public.current_role()::text in ('administrator', 'manager', 'attendant', 'finance', 'inventory'))
    or public.current_role() = 'super_admin'
  );

drop policy if exists recipes_org_select on public.recipes;
create policy recipes_org_select
  on public.recipes for select
  using (
    (organization_id = public.current_organization_id()
      and public.current_role()::text in ('administrator', 'manager', 'attendant', 'finance', 'inventory'))
    or public.current_role() = 'super_admin'
  );

drop policy if exists recipes_org_write on public.recipes;
drop policy if exists recipes_org_insert on public.recipes;
create policy recipes_org_insert
  on public.recipes for insert
  with check (
    (organization_id = public.current_organization_id()
      and public.current_role()::text in ('administrator', 'manager', 'inventory'))
    or public.current_role() = 'super_admin'
  );

drop policy if exists recipes_org_update on public.recipes;
create policy recipes_org_update
  on public.recipes for update
  using (
    (organization_id = public.current_organization_id()
      and public.current_role()::text in ('administrator', 'manager', 'inventory'))
    or public.current_role() = 'super_admin'
  )
  with check (
    (organization_id = public.current_organization_id()
      and public.current_role()::text in ('administrator', 'manager', 'inventory'))
    or public.current_role() = 'super_admin'
  );

drop policy if exists recipe_items_org_select on public.recipe_items;
create policy recipe_items_org_select
  on public.recipe_items for select
  using (
    (organization_id = public.current_organization_id()
      and public.current_role()::text in ('administrator', 'manager', 'attendant', 'finance', 'inventory'))
    or public.current_role() = 'super_admin'
  );

drop policy if exists recipe_items_org_write on public.recipe_items;
create policy recipe_items_org_write
  on public.recipe_items for all
  using (
    (organization_id = public.current_organization_id()
      and public.current_role()::text in ('administrator', 'manager', 'inventory'))
    or public.current_role() = 'super_admin'
  )
  with check (
    (organization_id = public.current_organization_id()
      and public.current_role()::text in ('administrator', 'manager', 'inventory'))
    or public.current_role() = 'super_admin'
  );

drop policy if exists access_consumptions_org_select on public.access_consumptions;
create policy access_consumptions_org_select
  on public.access_consumptions for select
  using (
    (organization_id = public.current_organization_id()
      and public.current_role()::text in ('administrator', 'manager', 'attendant', 'finance', 'inventory'))
    or public.current_role() = 'super_admin'
  );

drop policy if exists access_consumptions_client_read on public.access_consumptions;
create policy access_consumptions_client_read
  on public.access_consumptions for select
  using (client_id = public.current_client_id());

drop policy if exists consumption_items_org_select on public.consumption_items;
create policy consumption_items_org_select
  on public.consumption_items for select
  using (
    (organization_id = public.current_organization_id()
      and public.current_role()::text in ('administrator', 'manager', 'attendant', 'finance', 'inventory'))
    or public.current_role() = 'super_admin'
  );

drop policy if exists consumption_items_client_read on public.consumption_items;
create policy consumption_items_client_read
  on public.consumption_items for select
  using (
    exists (
      select 1
      from public.access_consumptions ac
      where ac.id = access_consumption_id
        and ac.client_id = public.current_client_id()
    )
  );

-- Escritas de consumo serão feitas por funções transacionais nas próximas etapas.

insert into storage.buckets (id, name, public)
values
  ('product-images', 'product-images', false),
  ('recipe-images', 'recipe-images', false)
on conflict (id) do nothing;

drop policy if exists commercial_images_org_read on storage.objects;
create policy commercial_images_org_read
  on storage.objects for select
  using (
    bucket_id in ('product-images', 'recipe-images')
    and (storage.foldername(name))[1] = public.current_organization_id()::text
  );

drop policy if exists commercial_images_org_insert on storage.objects;
create policy commercial_images_org_insert
  on storage.objects for insert
  with check (
    bucket_id in ('product-images', 'recipe-images')
    and (storage.foldername(name))[1] = public.current_organization_id()::text
    and public.current_role()::text in ('super_admin', 'administrator', 'manager', 'inventory')
  );

drop policy if exists commercial_images_org_update on storage.objects;
create policy commercial_images_org_update
  on storage.objects for update
  using (
    bucket_id in ('product-images', 'recipe-images')
    and (storage.foldername(name))[1] = public.current_organization_id()::text
    and public.current_role()::text in ('super_admin', 'administrator', 'manager', 'inventory')
  )
  with check (
    bucket_id in ('product-images', 'recipe-images')
    and (storage.foldername(name))[1] = public.current_organization_id()::text
    and public.current_role()::text in ('super_admin', 'administrator', 'manager', 'inventory')
  );

drop policy if exists commercial_images_org_delete on storage.objects;
create policy commercial_images_org_delete
  on storage.objects for delete
  using (
    bucket_id in ('product-images', 'recipe-images')
    and (storage.foldername(name))[1] = public.current_organization_id()::text
    and public.current_role()::text in ('super_admin', 'administrator', 'manager', 'inventory')
  );
