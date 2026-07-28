-- Fase 6: cadastro transacional de receitas e preparações.

create or replace function public.save_recipe(
  p_recipe_id uuid,
  p_name text,
  p_category text,
  p_description text,
  p_sale_price numeric,
  p_active boolean,
  p_notes text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_recipe_id uuid;
  v_item jsonb;
  v_product public.products%rowtype;
  v_product_id uuid;
  v_quantity numeric(18,6);
  v_sort_order integer := 0;
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
    raise exception 'Você não tem permissão para cadastrar preparações.';
  end if;

  if nullif(trim(p_name), '') is null then
    raise exception 'Informe o nome da preparação.';
  end if;

  if p_sale_price is null or p_sale_price < 0 then
    raise exception 'Informe um preço de venda válido.';
  end if;

  if p_items is null
    or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) = 0
  then
    raise exception 'Adicione pelo menos um ingrediente.';
  end if;

  if p_recipe_id is null then
    insert into public.recipes (
      organization_id,
      name,
      category,
      description,
      sale_price,
      active,
      notes,
      created_by
    )
    values (
      v_profile.organization_id,
      trim(p_name),
      nullif(trim(p_category), ''),
      nullif(trim(p_description), ''),
      p_sale_price,
      coalesce(p_active, true),
      nullif(trim(p_notes), ''),
      v_profile.id
    )
    returning id into v_recipe_id;
  else
    update public.recipes
    set
      name = trim(p_name),
      category = nullif(trim(p_category), ''),
      description = nullif(trim(p_description), ''),
      sale_price = p_sale_price,
      active = coalesce(p_active, true),
      notes = nullif(trim(p_notes), '')
    where id = p_recipe_id
      and (
        organization_id = v_profile.organization_id
        or v_profile.role::text = 'super_admin'
      )
    returning id into v_recipe_id;

    if v_recipe_id is null then
      raise exception 'Preparação não encontrada.';
    end if;

    delete from public.recipe_items where recipe_id = v_recipe_id;
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::numeric;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'A quantidade dos ingredientes deve ser maior que zero.';
    end if;

    select *
    into v_product
    from public.products
    where id = v_product_id
      and active = true
      and (
        organization_id = v_profile.organization_id
        or v_profile.role::text = 'super_admin'
      );

    if v_product.id is null then
      raise exception 'Um dos produtos selecionados não está disponível.';
    end if;

    if exists (
      select 1
      from public.recipe_items
      where recipe_id = v_recipe_id
        and product_id = v_product.id
    ) then
      raise exception 'O produto % foi adicionado mais de uma vez.', v_product.name;
    end if;

    insert into public.recipe_items (
      organization_id,
      recipe_id,
      product_id,
      quantity,
      unit,
      sort_order
    )
    values (
      v_product.organization_id,
      v_recipe_id,
      v_product.id,
      v_quantity,
      v_product.consumption_unit,
      v_sort_order
    );

    v_sort_order := v_sort_order + 1;
  end loop;

  return v_recipe_id;
end;
$$;

revoke all on function public.save_recipe(
  uuid, text, text, text, numeric, boolean, text, jsonb
) from public;

grant execute on function public.save_recipe(
  uuid, text, text, text, numeric, boolean, text, jsonb
) to authenticated;

