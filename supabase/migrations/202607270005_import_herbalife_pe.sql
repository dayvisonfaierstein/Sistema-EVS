-- Importação transacional da tabela pública Herbalife para Pernambuco.

create or replace function public.import_herbalife_pe_products(
  p_rows jsonb,
  p_cost_basis text default 'price_50'
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_org uuid := public.current_organization_id();
  v_role text := public.current_role()::text;
  v_row jsonb;
  v_product_id uuid;
  v_exists boolean;
  v_action text;
  v_cost numeric(14,6);
  v_created integer := 0;
  v_updated integer := 0;
  v_skipped integer := 0;
begin
  if v_org is null then
    raise exception 'Organização do usuário não encontrada.';
  end if;

  if v_role not in ('super_admin', 'administrator', 'manager', 'inventory') then
    raise exception 'Você não possui permissão para importar produtos.';
  end if;

  if p_cost_basis not in ('gross_price', 'price_25', 'price_35', 'price_42', 'price_50') then
    raise exception 'Faixa de custo inválida.';
  end if;

  for v_row in select value from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb))
  loop
    v_action := coalesce(v_row->>'action', 'skip');
    if v_action not in ('create', 'update') then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    select p.id into v_product_id
    from public.products p
    where p.organization_id = v_org
      and upper(p.sku) = upper(trim(v_row->>'sku'))
    limit 1;
    v_exists := v_product_id is not null;

    v_cost := case p_cost_basis
      when 'gross_price' then (v_row->>'gross_price')::numeric
      when 'price_25' then (v_row->>'price_25')::numeric
      when 'price_35' then (v_row->>'price_35')::numeric
      when 'price_42' then (v_row->>'price_42')::numeric
      else (v_row->>'price_50')::numeric
    end;

    if v_exists and v_action = 'update' then
      update public.products
      set
        name = trim(v_row->>'name'),
        brand = 'Herbalife',
        volume_points = (v_row->>'volume_points')::numeric,
        cost_price = v_cost,
        sale_price = (v_row->>'gross_price')::numeric,
        verification_status = 'updated',
        source_name = v_row->>'source_name',
        source_url = v_row->>'source_url',
        source_reference_date = (v_row->>'reference_date')::date
      where id = v_product_id;
      v_updated := v_updated + 1;
    elsif not v_exists and v_action = 'create' then
      insert into public.products (
        organization_id, name, brand, sku, unit, stock_unit, consumption_unit,
        volume_points, pv_last_updated_at, cost_price, sale_price, minimum_stock,
        current_stock, track_batches, active, notes, verification_status,
        source_name, source_url, source_reference_date
      )
      values (
        v_org, trim(v_row->>'name'), 'Herbalife', upper(trim(v_row->>'sku')),
        'unit', 'unit', 'unit', (v_row->>'volume_points')::numeric, now(),
        v_cost, (v_row->>'gross_price')::numeric, 0, 0, true, true,
        'Complete embalagem, categoria e unidades antes de movimentar o estoque.',
        'pending', v_row->>'source_name', v_row->>'source_url',
        (v_row->>'reference_date')::date
      )
      returning id into v_product_id;
      v_created := v_created + 1;
    else
      v_skipped := v_skipped + 1;
      continue;
    end if;

    insert into public.product_reference_prices (
      organization_id, product_id, state_code, reference_date, gross_price,
      earnings_base, price_25, price_35, price_42, price_50,
      source_name, source_url, imported_by
    )
    values (
      v_org, v_product_id, 'PE', (v_row->>'reference_date')::date,
      (v_row->>'gross_price')::numeric, (v_row->>'earnings_base')::numeric,
      (v_row->>'price_25')::numeric, (v_row->>'price_35')::numeric,
      (v_row->>'price_42')::numeric, (v_row->>'price_50')::numeric,
      v_row->>'source_name', v_row->>'source_url', auth.uid()
    )
    on conflict (organization_id, product_id, state_code, reference_date)
    do update set
      gross_price = excluded.gross_price,
      earnings_base = excluded.earnings_base,
      price_25 = excluded.price_25,
      price_35 = excluded.price_35,
      price_42 = excluded.price_42,
      price_50 = excluded.price_50,
      source_name = excluded.source_name,
      source_url = excluded.source_url,
      imported_by = excluded.imported_by,
      updated_at = now();
  end loop;

  return jsonb_build_object(
    'created', v_created,
    'updated', v_updated,
    'skipped', v_skipped
  );
end;
$$;

revoke all on function public.import_herbalife_pe_products(jsonb, text) from public;
grant execute on function public.import_herbalife_pe_products(jsonb, text) to authenticated;
