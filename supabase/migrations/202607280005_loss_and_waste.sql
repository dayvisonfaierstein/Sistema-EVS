-- Fase 9: perdas e desperdícios com snapshots financeiros e de PV.

alter table public.inventory_movements
  add column if not exists loss_reason text,
  add column if not exists unit_cost_snapshot numeric(14,6),
  add column if not exists cost_total numeric(14,6),
  add column if not exists pv_total numeric(18,6);

alter table public.inventory_movements
  drop constraint if exists inventory_movements_loss_reason_valid,
  add constraint inventory_movements_loss_reason_valid check (
    loss_reason is null
    or loss_reason in (
      'expiration',
      'spill',
      'preparation_error',
      'damaged_package',
      'stock_adjustment',
      'other'
    )
  );

create or replace function public.snapshot_inventory_loss()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_unit_pv numeric(18,9);
begin
  if new.movement_type not in ('loss', 'expiration', 'negative_adjustment') then
    return new;
  end if;

  select *
  into v_product
  from public.products
  where id = new.product_id;

  if v_product.id is null then
    raise exception 'Produto da perda não encontrado.';
  end if;

  new.loss_reason := case
    when new.movement_type = 'expiration' then 'expiration'
    when new.movement_type = 'negative_adjustment' then 'stock_adjustment'
    when lower(trim(coalesce(new.reason, ''))) = 'vencimento' then 'expiration'
    when lower(trim(coalesce(new.reason, ''))) = 'derramamento' then 'spill'
    when lower(trim(coalesce(new.reason, ''))) = 'erro de preparo' then 'preparation_error'
    when lower(trim(coalesce(new.reason, ''))) = 'embalagem danificada' then 'damaged_package'
    when lower(trim(coalesce(new.reason, ''))) = 'ajuste de estoque' then 'stock_adjustment'
    else 'other'
  end;

  v_unit_pv := case
    when v_product.volume_points is not null and v_product.package_content > 0
      then v_product.volume_points / v_product.package_content
    else 0
  end;

  new.unit_cost_snapshot := v_product.average_cost;
  new.cost_total := round(new.quantity * v_product.average_cost, 6);
  new.pv_total := round(new.quantity * v_unit_pv, 6);
  return new;
end;
$$;

drop trigger if exists snapshot_inventory_loss on public.inventory_movements;
create trigger snapshot_inventory_loss
  before insert on public.inventory_movements
  for each row execute function public.snapshot_inventory_loss();

update public.inventory_movements m
set
  loss_reason = case
    when m.movement_type = 'expiration' then 'expiration'
    when m.movement_type = 'negative_adjustment' then 'stock_adjustment'
    when lower(trim(coalesce(m.reason, ''))) = 'derramamento' then 'spill'
    when lower(trim(coalesce(m.reason, ''))) = 'erro de preparo' then 'preparation_error'
    when lower(trim(coalesce(m.reason, ''))) = 'embalagem danificada' then 'damaged_package'
    when lower(trim(coalesce(m.reason, ''))) = 'ajuste de estoque' then 'stock_adjustment'
    else 'other'
  end,
  unit_cost_snapshot = p.average_cost,
  cost_total = round(m.quantity * p.average_cost, 6),
  pv_total = round(
    m.quantity * case
      when p.volume_points is not null and p.package_content > 0
        then p.volume_points / p.package_content
      else 0
    end,
    6
  )
from public.products p
where p.id = m.product_id
  and m.movement_type in ('loss', 'expiration', 'negative_adjustment')
  and m.cost_total is null;

create index if not exists inventory_movements_loss_period_idx
  on public.inventory_movements(organization_id, loss_reason, created_at desc)
  where loss_reason is not null;

