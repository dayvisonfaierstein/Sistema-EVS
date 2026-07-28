-- Consolidação das fases comerciais: auditoria automática e FEFO nas saídas manuais.

create or replace function public.audit_commercial_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_org uuid;
  v_entity_id uuid;
begin
  v_old := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  v_new := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  v_org := coalesce(
    case when tg_op <> 'DELETE' then new.organization_id else null end,
    case when tg_op <> 'INSERT' then old.organization_id else null end
  );
  v_entity_id := coalesce(
    case when tg_op <> 'DELETE' then new.id else null end,
    case when tg_op <> 'INSERT' then old.id else null end
  );

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
    v_org,
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    v_entity_id,
    v_old,
    v_new
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'product_categories',
    'products',
    'product_batches',
    'inventory_movements',
    'recipes',
    'recipe_items',
    'access_consumptions'
  ]
  loop
    execute format('drop trigger if exists audit_commercial_change on public.%I', v_table);
    execute format(
      'create trigger audit_commercial_change
       after insert or update or delete on public.%I
       for each row execute function public.audit_commercial_change()',
      v_table
    );
  end loop;
end;
$$;

create or replace function public.consume_manual_movement_batches_fefo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining numeric(18,6);
  v_take numeric(18,6);
  v_batch record;
begin
  if new.reference_type <> 'manual'
    or new.movement_type not in (
      'consumption',
      'sale',
      'loss',
      'expiration',
      'negative_adjustment'
    )
  then
    return new;
  end if;

  v_remaining := new.quantity;

  for v_batch in
    select id, current_quantity
    from public.product_batches
    where product_id = new.product_id
      and organization_id = new.organization_id
      and status = 'active'
      and current_quantity > 0
    order by expiration_date asc nulls last, received_at asc
    for update
  loop
    exit when v_remaining <= 0;
    v_take := least(v_batch.current_quantity, v_remaining);

    update public.product_batches
    set
      current_quantity = current_quantity - v_take,
      status = case
        when current_quantity - v_take <= 0 then 'consumed'
        else status
      end
    where id = v_batch.id;

    v_remaining := v_remaining - v_take;
  end loop;

  return new;
end;
$$;

drop trigger if exists consume_manual_movement_batches_fefo on public.inventory_movements;
create trigger consume_manual_movement_batches_fefo
  after insert on public.inventory_movements
  for each row execute function public.consume_manual_movement_batches_fefo();

alter table public.organizations
  add column if not exists product_cost_basis text not null default 'price_50';

alter table public.organizations
  drop constraint if exists organizations_product_cost_basis_valid,
  add constraint organizations_product_cost_basis_valid
    check (product_cost_basis in ('gross_price', 'price_25', 'price_35', 'price_42', 'price_50'));

create or replace function public.get_product_cost_basis()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(o.product_cost_basis, 'price_50')
  from public.organizations o
  where o.id = public.current_organization_id()
     or public.current_role() = 'super_admin'
  order by (o.id = public.current_organization_id()) desc
  limit 1
$$;

create or replace function public.set_product_cost_basis(p_cost_basis text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_role()::text not in ('super_admin', 'administrator', 'manager', 'inventory') then
    raise exception 'Você não possui permissão para alterar a faixa de custo.';
  end if;
  if p_cost_basis not in ('gross_price', 'price_25', 'price_35', 'price_42', 'price_50') then
    raise exception 'Faixa de custo inválida.';
  end if;
  update public.organizations
  set product_cost_basis = p_cost_basis
  where id = public.current_organization_id();
end;
$$;

revoke all on function public.get_product_cost_basis() from public;
revoke all on function public.set_product_cost_basis(text) from public;
grant execute on function public.get_product_cost_basis() to authenticated;
grant execute on function public.set_product_cost_basis(text) to authenticated;
