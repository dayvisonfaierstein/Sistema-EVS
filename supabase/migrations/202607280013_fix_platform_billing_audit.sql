-- Corrige o gatilho genérico: plans não possui organization_id.
-- A leitura via JSON permite reutilizar a função em tabelas com estruturas diferentes.

create or replace function public.audit_platform_billing_change()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  old_record jsonb;
  new_record jsonb;
  current_record jsonb;
  target_organization uuid;
  target_id uuid;
begin
  old_record := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  new_record := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  current_record := coalesce(new_record, old_record);

  target_organization := nullif(current_record ->> 'organization_id', '')::uuid;
  target_id := nullif(current_record ->> 'id', '')::uuid;

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
    target_organization,
    auth.uid(),
    'platform_billing.' || lower(tg_op),
    tg_table_name,
    target_id,
    old_record,
    new_record
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end
$$;

comment on function public.audit_platform_billing_change() is
  'Audita planos, assinaturas e pagamentos sem presumir colunas iguais entre as tabelas.';
