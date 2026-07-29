-- Corrige e centraliza a resolução dos comunicados disponíveis ao usuário atual.

create or replace function public.get_my_platform_announcements()
returns jsonb
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  with context as (
    select
      auth.uid() as profile_id,
      public.current_organization_id() as organization_id
  ),
  delivery as (
    select
      announcement.*,
      (
        select to_jsonb(receipt)
        from public.platform_announcement_receipts receipt
        where receipt.announcement_id = announcement.id
          and receipt.profile_id = context.profile_id
        limit 1
      ) as receipt
    from public.platform_announcements announcement
    cross join context
    where context.profile_id is not null
      and context.organization_id is not null
      and announcement.status in ('scheduled', 'published')
      and coalesce(
        announcement.starts_at,
        announcement.published_at,
        announcement.created_at
      ) <= now()
      and (announcement.ends_at is null or announcement.ends_at > now())
      and (
        announcement.audience_type = 'all'
        or exists (
          select 1
          from public.platform_announcement_recipients recipient
          where recipient.announcement_id = announcement.id
            and recipient.organization_id = context.organization_id
        )
      )
    order by
      case announcement.priority
        when 'urgent' then 1
        when 'important' then 2
        else 3
      end,
      announcement.published_at desc nulls last,
      announcement.created_at desc
  )
  select coalesce(jsonb_agg(to_jsonb(delivery)), '[]'::jsonb)
  from delivery
$$;

revoke all on function public.get_my_platform_announcements() from public;
grant execute on function public.get_my_platform_announcements() to authenticated;

comment on function public.get_my_platform_announcements() is
  'Retorna somente os comunicados ativos destinados à organização do usuário autenticado.';
