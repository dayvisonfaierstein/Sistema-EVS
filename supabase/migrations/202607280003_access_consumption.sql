-- Fase 7: acesso do cliente com consumo e baixa atômica de estoque.

create or replace function public.register_access_with_consumption(
  p_client_id uuid,
  p_access_type text,
  p_service_performed text,
  p_notes text,
  p_consumption_type text,
  p_item_id uuid,
  p_quantity numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_client public.clients%rowtype;
  v_access_id uuid;
  v_consumption_id uuid;
  v_recipe public.recipes%rowtype;
  v_product public.products%rowtype;
  v_recipe_item public.recipe_items%rowtype;
  v_required numeric(18,6);
  v_previous numeric(18,6);
  v_new numeric(18,6);
  v_unit_cost numeric(14,6);
  v_unit_pv numeric(18,9);
  v_cost numeric(14,6);
  v_pv numeric(18,6);
  v_total_cost numeric(14,6) := 0;
  v_total_pv numeric(18,6) := 0;
  v_movement_id uuid;
  v_batch record;
  v_remaining numeric(18,6);
  v_take numeric(18,6);
  v_name text;
  v_sale_price numeric(14,2) := 0;
begin
  select *
  into v_profile
  from public.profiles
  where id = auth.uid()
    and active = true;

  if v_profile.id is null then
    raise exception 'Usuário ativo não encontrado.';
  end if;

  if v_profile.role::text not in (
    'super_admin', 'administrator', 'manager', 'attendant', 'inventory'
  ) then
    raise exception 'Você não tem permissão para registrar acessos.';
  end if;

  select *
  into v_client
  from public.clients
  where id = p_client_id
    and (
      organization_id = v_profile.organization_id
      or v_profile.role::text = 'super_admin'
    );

  if v_client.id is null then
    raise exception 'Cliente não encontrado.';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_client_id::text));
  if exists (
    select 1
    from public.accesses
    where client_id = p_client_id
      and accessed_at > now() - interval '60 seconds'
  ) then
    raise exception 'Acesso já registrado no último minuto.';
  end if;

  insert into public.accesses (
    organization_id,
    client_id,
    attendant_id,
    access_type,
    service_performed,
    notes
  )
  values (
    v_client.organization_id,
    v_client.id,
    v_profile.id,
    coalesce(nullif(trim(p_access_type), ''), 'visit'),
    nullif(trim(p_service_performed), ''),
    nullif(trim(p_notes), '')
  )
  returning id into v_access_id;

  update public.clients
  set last_visit_at = now()
  where id = v_client.id;

  if p_consumption_type is null or p_consumption_type = 'none' then
    return jsonb_build_object('access_id', v_access_id, 'consumption_id', null);
  end if;

  if p_consumption_type not in ('recipe', 'product') then
    raise exception 'Tipo de consumo inválido.';
  end if;

  if p_item_id is null or p_quantity is null or p_quantity <= 0 then
    raise exception 'Selecione o consumo e informe uma quantidade válida.';
  end if;

  if p_consumption_type = 'recipe' then
    select *
    into v_recipe
    from public.recipes
    where id = p_item_id
      and active = true
      and (
        organization_id = v_client.organization_id
        or v_profile.role::text = 'super_admin'
      );

    if v_recipe.id is null then
      raise exception 'Preparação não encontrada.';
    end if;

    if not exists (select 1 from public.recipe_items where recipe_id = v_recipe.id) then
      raise exception 'A preparação não possui ingredientes.';
    end if;

    v_name := v_recipe.name;
    v_sale_price := round(v_recipe.sale_price * p_quantity, 2);

    insert into public.access_consumptions (
      organization_id,
      access_id,
      client_id,
      consumption_type,
      recipe_id,
      item_name_snapshot,
      quantity,
      sale_price_snapshot,
      created_by
    )
    values (
      v_client.organization_id,
      v_access_id,
      v_client.id,
      'recipe',
      v_recipe.id,
      v_recipe.name,
      p_quantity,
      v_sale_price,
      v_profile.id
    )
    returning id into v_consumption_id;

    for v_recipe_item in
      select *
      from public.recipe_items
      where recipe_id = v_recipe.id
      order by product_id
    loop
      select *
      into v_product
      from public.products
      where id = v_recipe_item.product_id
        and active = true
      for update;

      if v_product.id is null then
        raise exception 'Um ingrediente da preparação não está disponível.';
      end if;

      v_required := round(v_recipe_item.quantity * p_quantity, 6);
      v_previous := v_product.current_stock;
      v_new := v_previous - v_required;

      if v_new < 0 then
        raise exception 'Estoque insuficiente de %. Necessário: % %. Disponível: % %.',
          v_product.name,
          v_required,
          v_product.consumption_unit,
          v_previous,
          v_product.consumption_unit;
      end if;

      v_unit_cost := case
        when v_product.average_cost > 0 then v_product.average_cost
        when v_product.package_content > 0
          then v_product.cost_price / v_product.package_content
        else v_product.cost_price
      end;
      v_unit_pv := case
        when v_product.volume_points is not null and v_product.package_content > 0
          then v_product.volume_points / v_product.package_content
        else 0
      end;
      v_cost := round(v_required * v_unit_cost, 6);
      v_pv := round(v_required * v_unit_pv, 6);

      perform set_config('app.inventory_movement', 'on', true);
      update public.products set current_stock = v_new where id = v_product.id;

      v_remaining := v_required;
      for v_batch in
        select id, current_quantity
        from public.product_batches
        where product_id = v_product.id
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
          status = case when current_quantity - v_take <= 0 then 'consumed' else status end
        where id = v_batch.id;
        v_remaining := v_remaining - v_take;
      end loop;

      insert into public.inventory_movements (
        organization_id, product_id, access_id, movement_type, quantity, unit,
        previous_balance, new_balance, reason, reference_type, reference_id, user_id
      )
      values (
        v_product.organization_id, v_product.id, v_access_id, 'consumption', v_required,
        v_product.consumption_unit, v_previous, v_new, 'Consumo no acesso',
        'access_consumption', v_consumption_id, v_profile.id
      )
      returning id into v_movement_id;

      insert into public.consumption_items (
        organization_id, access_consumption_id, product_id, inventory_movement_id,
        product_name_snapshot, sku_snapshot, quantity, unit, unit_cost_snapshot,
        cost_total, unit_pv_snapshot, pv_total
      )
      values (
        v_product.organization_id, v_consumption_id, v_product.id, v_movement_id,
        v_product.name, v_product.sku, v_required, v_product.consumption_unit,
        v_unit_cost, v_cost, v_unit_pv, v_pv
      );

      v_total_cost := v_total_cost + v_cost;
      v_total_pv := v_total_pv + v_pv;
    end loop;
  else
    select *
    into v_product
    from public.products
    where id = p_item_id
      and active = true
      and (
        organization_id = v_client.organization_id
        or v_profile.role::text = 'super_admin'
      )
    for update;

    if v_product.id is null then
      raise exception 'Produto não encontrado.';
    end if;

    v_required := round(p_quantity, 6);
    v_previous := v_product.current_stock;
    v_new := v_previous - v_required;

    if v_new < 0 then
      raise exception 'Estoque insuficiente de %. Necessário: % %. Disponível: % %.',
        v_product.name,
        v_required,
        v_product.consumption_unit,
        v_previous,
        v_product.consumption_unit;
    end if;

    v_unit_cost := case
      when v_product.average_cost > 0 then v_product.average_cost
      when v_product.package_content > 0
        then v_product.cost_price / v_product.package_content
      else v_product.cost_price
    end;
    v_unit_pv := case
      when v_product.volume_points is not null and v_product.package_content > 0
        then v_product.volume_points / v_product.package_content
      else 0
    end;
    v_cost := round(v_required * v_unit_cost, 6);
    v_pv := round(v_required * v_unit_pv, 6);
    v_name := v_product.name;
    v_sale_price := round(v_product.sale_price * p_quantity, 2);

    insert into public.access_consumptions (
      organization_id, access_id, client_id, consumption_type, direct_product_id,
      item_name_snapshot, quantity, sale_price_snapshot, cost_total, pv_total, created_by
    )
    values (
      v_client.organization_id, v_access_id, v_client.id, 'product', v_product.id,
      v_product.name, p_quantity, v_sale_price, v_cost, v_pv, v_profile.id
    )
    returning id into v_consumption_id;

    perform set_config('app.inventory_movement', 'on', true);
    update public.products set current_stock = v_new where id = v_product.id;

    v_remaining := v_required;
    for v_batch in
      select id, current_quantity
      from public.product_batches
      where product_id = v_product.id
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
        status = case when current_quantity - v_take <= 0 then 'consumed' else status end
      where id = v_batch.id;
      v_remaining := v_remaining - v_take;
    end loop;

    insert into public.inventory_movements (
      organization_id, product_id, access_id, movement_type, quantity, unit,
      previous_balance, new_balance, reason, reference_type, reference_id, user_id
    )
    values (
      v_product.organization_id, v_product.id, v_access_id, 'consumption', v_required,
      v_product.consumption_unit, v_previous, v_new, 'Consumo avulso no acesso',
      'access_consumption', v_consumption_id, v_profile.id
    )
    returning id into v_movement_id;

    insert into public.consumption_items (
      organization_id, access_consumption_id, product_id, inventory_movement_id,
      product_name_snapshot, sku_snapshot, quantity, unit, unit_cost_snapshot,
      cost_total, unit_pv_snapshot, pv_total
    )
    values (
      v_product.organization_id, v_consumption_id, v_product.id, v_movement_id,
      v_product.name, v_product.sku, v_required, v_product.consumption_unit,
      v_unit_cost, v_cost, v_unit_pv, v_pv
    );

    v_total_cost := v_cost;
    v_total_pv := v_pv;
  end if;

  update public.access_consumptions
  set cost_total = v_total_cost, pv_total = v_total_pv
  where id = v_consumption_id;

  return jsonb_build_object(
    'access_id', v_access_id,
    'consumption_id', v_consumption_id,
    'item_name', v_name,
    'cost_total', v_total_cost,
    'pv_total', v_total_pv
  );
end;
$$;

revoke all on function public.register_access_with_consumption(
  uuid, text, text, text, text, uuid, numeric
) from public;

grant execute on function public.register_access_with_consumption(
  uuid, text, text, text, text, uuid, numeric
) to authenticated;
