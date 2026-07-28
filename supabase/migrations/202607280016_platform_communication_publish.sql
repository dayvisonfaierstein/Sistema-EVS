-- Publicação transacional e auditada de comunicados da plataforma.

create or replace function public.admin_publish_platform_announcement(
  target_announcement_id uuid,
  target_organization_ids uuid[] default array[]::uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  announcement public.platform_announcements%rowtype;
begin
  if not public.is_super_admin() then
    raise exception 'Somente o Super Admin pode publicar comunicados'
      using errcode = '42501';
  end if;

  select * into announcement
  from public.platform_announcements
  where id = target_announcement_id
    and status in ('draft', 'scheduled')
  for update;

  if not found then
    raise exception 'Comunicado não encontrado ou já finalizado';
  end if;

  delete from public.platform_announcement_recipients
  where announcement_id = target_announcement_id;

  if announcement.audience_type = 'organizations' then
    if cardinality(target_organization_ids) = 0 then
      raise exception 'Selecione pelo menos um Espaço';
    end if;
    insert into public.platform_announcement_recipients (
      announcement_id,
      organization_id
    )
    select target_announcement_id, organization.id
    from public.organizations organization
    where organization.id = any(target_organization_ids)
      and organization.deleted_at is null
    on conflict do nothing;
  elsif announcement.audience_type = 'subscription_overdue' then
    insert into public.platform_announcement_recipients (
      announcement_id,
      organization_id
    )
    select distinct target_announcement_id, subscription.organization_id
    from public.subscriptions subscription
    join public.organizations organization on organization.id = subscription.organization_id
    where subscription.status in ('overdue', 'grace_period', 'blocked')
      and organization.deleted_at is null
    on conflict do nothing;
  elsif announcement.audience_type = 'subscription_trial' then
    insert into public.platform_announcement_recipients (
      announcement_id,
      organization_id
    )
    select target_announcement_id, organization.id
    from public.organizations organization
    where (
      organization.status = 'trial'
      or organization.subscription_status = 'trial'
    )
      and organization.deleted_at is null
    on conflict do nothing;
  end if;

  update public.platform_announcements
  set
    status = case
      when starts_at is not null and starts_at > now() then 'scheduled'
      else 'published'
    end,
    published_at = case
      when starts_at is null or starts_at <= now() then coalesce(published_at, now())
      else published_at
    end,
    updated_by = auth.uid()
  where id = target_announcement_id;

  insert into public.audit_logs (
    organization_id, user_id, action, entity, entity_id, new_data
  )
  values (
    null,
    auth.uid(),
    'platform_announcement.published',
    'platform_announcement',
    target_announcement_id,
    jsonb_build_object(
      'audience_type', announcement.audience_type,
      'channels', announcement.display_channels,
      'starts_at', announcement.starts_at,
      'ends_at', announcement.ends_at
    )
  );
end
$$;

revoke all on function public.admin_publish_platform_announcement(uuid, uuid[]) from public;
grant execute on function public.admin_publish_platform_announcement(uuid, uuid[]) to authenticated;

comment on function public.admin_publish_platform_announcement(uuid, uuid[]) is
  'Resolve destinatários, publica ou agenda o comunicado e registra auditoria.';
