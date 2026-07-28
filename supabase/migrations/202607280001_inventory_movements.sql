-- Fase 5: movimentações reais de estoque, lotes e custo médio.

alter table public.inventory_movements
  drop constraint if exists inventory_movements_type_valid,
  add constraint inventory_movements_type_valid check (
    movement_type in (
      'purchase',
      'positive_adjustment',
      'return',
      'consumption',
      'sale',
      'loss',
      'expiration',
      'negative_adjustment'
    )
  ) not valid,
  drop constraint if exists inventory_movements_quantity_positive,
  add constraint inventory_movements_quantity_positive check (quantity > 0) not valid;

create or replace function public.prevent_direct_stock_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.current_stock is distinct from old.current_stock
    and coalesce(current_setting('app.inventory_movement', true), '') <> 'on'
  then
    raise exception 'O saldo somente pode ser alterado por uma movimentação de estoque.';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_direct_stock_change on public.products;
create trigger prevent_direct_stock_change
  before update of current_stock on public.products
  for each row execute function public.prevent_direct_stock_change();

create or replace function public.register_inventory_movement(
  p_product_id uuid,
  p_movement_type text,
  p_quantity numeric,
  p_quantity_mode text,
  p_reason text,
  p_notes text default null,
  p_unit_cost numeric default null,
  p_batch_number text default null,
  p_manufacture_date date default null,
  p_expiration_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_product public.products%rowtype;
  v_is_entry boolean;
  v_consumption_quantity numeric(18,6);
  v_previous_balance numeric(18,6);
  v_new_balance numeric(18,6);
  v_unit_cost numeric(14,6);
  v_new_average_cost numeric(14,6);
  v_batch_id uuid;
  v_movement_id uuid;
begin
  select *
  into v_profile
  from public.profiles
  where id = auth.uid()
    and active = true;

  if v_profile.id is null then
    raise exception 'Usuário ativo não encontrado.';
  end if;

  if v_profile.role::text not in ('super_admin', 'administrator', 'manager', 'inventory') then
    raise exception 'Você não tem permissão para movimentar o estoque.';
  end if;

  select *
  into v_product
  from public.products
  where id = p_product_id
    and (
      organization_id = v_profile.organization_id
      or v_profile.role::text = 'super_admin'
    )
  for update;

  if v_product.id is null then
    raise exception 'Produto não encontrado.';
  end if;

  if p_movement_type not in (
    'purchase',
    'positive_adjustment',
    'return',
    'consumption',
    'sale',
    'loss',
    'expiration',
    'negative_adjustment'
  ) then
    raise exception 'Tipo de movimentação inválido.';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'A quantidade deve ser maior que zero.';
  end if;

  if nullif(trim(p_reason), '') is null then
    raise exception 'Informe o motivo da movimentação.';
  end if;

  v_is_entry := p_movement_type in ('purchase', 'positive_adjustment', 'return');

  if p_quantity_mode = 'package' then
    if v_product.package_content is null or v_product.package_content <= 0 then
      raise exception 'Informe o conteúdo da embalagem no cadastro do produto.';
    end if;
    v_consumption_quantity := round(p_quantity * v_product.package_content, 6);
  elsif p_quantity_mode = 'consumption' then
    v_consumption_quantity := round(p_quantity, 6);
  else
    raise exception 'Unidade de lançamento inválida.';
  end if;

  v_previous_balance := v_product.current_stock;
  v_new_balance := case
    when v_is_entry then v_previous_balance + v_consumption_quantity
    else v_previous_balance - v_consumption_quantity
  end;

  if v_new_balance < 0 then
    raise exception 'Estoque insuficiente. Necessário: % %. Disponível: % %.',
      v_consumption_quantity,
      v_product.consumption_unit,
      v_previous_balance,
      v_product.consumption_unit;
  end if;

  v_new_average_cost := v_product.average_cost;
  if v_is_entry and p_unit_cost is not null then
    if p_unit_cost < 0 then
      raise exception 'O custo não pode ser negativo.';
    end if;

    v_unit_cost := case
      when p_quantity_mode = 'package'
        then p_unit_cost / v_product.package_content
      else p_unit_cost
    end;

    if v_new_balance > 0 then
      v_new_average_cost := round(
        ((v_previous_balance * v_product.average_cost)
          + (v_consumption_quantity * v_unit_cost))
        / v_new_balance,
        6
      );
    end if;
  end if;

  if v_is_entry and nullif(trim(p_batch_number), '') is not null then
    insert into public.product_batches (
      organization_id,
      product_id,
      batch_number,
      manufacture_date,
      expiration_date,
      package_quantity,
      package_unit,
      consumption_unit,
      initial_quantity,
      current_quantity,
      unit_cost,
      notes
    )
    values (
      v_product.organization_id,
      v_product.id,
      trim(p_batch_number),
      p_manufacture_date,
      p_expiration_date,
      case when p_quantity_mode = 'package' then p_quantity else null end,
      case when p_quantity_mode = 'package' then v_product.stock_unit else null end,
      v_product.consumption_unit,
      v_consumption_quantity,
      v_consumption_quantity,
      coalesce(v_unit_cost, v_product.average_cost),
      nullif(trim(p_notes), '')
    )
    returning id into v_batch_id;
  end if;

  perform set_config('app.inventory_movement', 'on', true);

  update public.products
  set
    current_stock = v_new_balance,
    average_cost = v_new_average_cost,
    cost_price = case
      when p_movement_type = 'purchase'
        and p_quantity_mode = 'package'
        and p_unit_cost is not null
      then p_unit_cost
      else cost_price
    end
  where id = v_product.id;

  insert into public.inventory_movements (
    organization_id,
    product_id,
    batch_id,
    movement_type,
    quantity,
    unit,
    previous_balance,
    new_balance,
    reason,
    notes,
    reference_type,
    user_id
  )
  values (
    v_product.organization_id,
    v_product.id,
    v_batch_id,
    p_movement_type,
    v_consumption_quantity,
    v_product.consumption_unit,
    v_previous_balance,
    v_new_balance,
    trim(p_reason),
    nullif(trim(p_notes), ''),
    'manual',
    v_profile.id
  )
  returning id into v_movement_id;

  return jsonb_build_object(
    'movement_id', v_movement_id,
    'product_id', v_product.id,
    'previous_balance', v_previous_balance,
    'new_balance', v_new_balance,
    'quantity', v_consumption_quantity,
    'unit', v_product.consumption_unit,
    'average_cost', v_new_average_cost,
    'batch_id', v_batch_id
  );
end;
$$;

revoke all on function public.register_inventory_movement(
  uuid, text, numeric, text, text, text, numeric, text, date, date
) from public;

grant execute on function public.register_inventory_movement(
  uuid, text, numeric, text, text, text, numeric, text, date, date
) to authenticated;

