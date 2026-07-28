-- Entrega, confirmação e gestão dos comunicados da plataforma.

create or replace function public.record_platform_announcement_event(
  target_announcement_id uuid,
  target_event text
)
returns public.platform_announcement_receipts
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  organization_id uuid := public.current_organization_id();
  receipt public.platform_announcement_receipts;
begin
  if auth.uid() is null or organization_id is null then
    raise exception 'Sessão ou organização não encontrada';
  end if;
  if target_event not in ('displayed', 'read', 'acknowledged', 'dismissed') then
    raise exception 'Evento inválido';
  end if;
  if not public.can_receive_platform_announcement(target_announcement_id, organization_id) then
    raise exception 'Comunicado indisponível para este usuário';
  end if;

  insert into public.platform_announcement_receipts (
    announcement_id, organization_id, profile_id, first_seen_at,
    last_displayed_at, read_at, acknowledged_at, dismissed_at, display_count
  )
  values (
    target_announcement_id, organization_id, auth.uid(),
    now(),
    case when target_event = 'displayed' then now() end,
    case when target_event in ('read', 'acknowledged') then now() end,
    case when target_event = 'acknowledged' then now() end,
    case when target_event = 'dismissed' then now() end,
    case when target_event = 'displayed' then 1 else 0 end
  )
  on conflict (announcement_id, profile_id) do update set
    first_seen_at = coalesce(
      platform_announcement_receipts.first_seen_at,
      excluded.first_seen_at
    ),
    last_displayed_at = coalesce(
      excluded.last_displayed_at,
      platform_announcement_receipts.last_displayed_at
    ),
    read_at = coalesce(
      platform_announcement_receipts.read_at,
      excluded.read_at
    ),
    acknowledged_at = coalesce(
      platform_announcement_receipts.acknowledged_at,
      excluded.acknowledged_at
    ),
    dismissed_at = coalesce(
      platform_announcement_receipts.dismissed_at,
      excluded.dismissed_at
    ),
    display_count = platform_announcement_receipts.display_count
      + case when target_event = 'displayed' then 1 else 0 end
  returning * into receipt;

  return receipt;
end
$$;

revoke all on function public.record_platform_announcement_event(uuid, text) from public;
grant execute on function public.record_platform_announcement_event(uuid, text) to authenticated;

create or replace function public.admin_cancel_platform_announcement(
  target_announcement_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Somente o Super Admin pode cancelar comunicados';
  end if;

  update public.platform_announcements
  set status = 'cancelled',
      cancelled_at = now(),
      updated_by = auth.uid()
  where id = target_announcement_id
    and status <> 'cancelled';

  if not found then
    raise exception 'Comunicado não encontrado ou já cancelado';
  end if;

  insert into public.audit_logs (
    organization_id, user_id, action, entity, entity_id, new_data
  )
  values (
    null,
    auth.uid(),
    'platform_announcement.cancelled',
    'platform_announcement',
    target_announcement_id,
    jsonb_build_object('cancelled_at', now())
  );
end
$$;

revoke all on function public.admin_cancel_platform_announcement(uuid) from public;
grant execute on function public.admin_cancel_platform_announcement(uuid) to authenticated;

create or replace function public.admin_platform_announcement_metrics()
returns table (
  announcement_id uuid,
  recipient_organizations bigint,
  reached_users bigint,
  read_users bigint,
  acknowledged_users bigint,
  dismissed_users bigint,
  total_displays bigint
)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select
    announcement.id,
    case
      when announcement.audience_type = 'all'
        then (select count(*) from public.organizations)
      else (
        select count(*)
        from public.platform_announcement_recipients recipient
        where recipient.announcement_id = announcement.id
      )
    end as recipient_organizations,
    (
      select count(*) from public.platform_announcement_receipts receipt
      where receipt.announcement_id = announcement.id and receipt.first_seen_at is not null
    ),
    (
      select count(*) from public.platform_announcement_receipts receipt
      where receipt.announcement_id = announcement.id and receipt.read_at is not null
    ),
    (
      select count(*) from public.platform_announcement_receipts receipt
      where receipt.announcement_id = announcement.id and receipt.acknowledged_at is not null
    ),
    (
      select count(*) from public.platform_announcement_receipts receipt
      where receipt.announcement_id = announcement.id and receipt.dismissed_at is not null
    ),
    (
      select coalesce(sum(receipt.display_count), 0)::bigint
      from public.platform_announcement_receipts receipt
      where receipt.announcement_id = announcement.id
    )
  from public.platform_announcements announcement
  where public.is_super_admin()
$$;

revoke all on function public.admin_platform_announcement_metrics() from public;
grant execute on function public.admin_platform_announcement_metrics() to authenticated;

comment on function public.record_platform_announcement_event(uuid, text) is
  'Registra de forma atômica exibição, leitura, confirmação ou descarte.';
comment on function public.admin_cancel_platform_announcement(uuid) is
  'Cancela um comunicado e registra a operação na auditoria.';
comment on function public.admin_platform_announcement_metrics() is
  'Retorna alcance e interações dos comunicados para o Super Admin.';
