-- Central de Comunicação da plataforma.
-- Mantém comunicados do Super Admin separados das notificações operacionais.

create table if not exists public.platform_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  announcement_type text not null default 'information',
  priority text not null default 'normal',
  audience_type text not null default 'all',
  audience_filter jsonb not null default '{}'::jsonb,
  display_channels text[] not null default array['notification_center']::text[],
  image_path text,
  action_label text,
  action_url text,
  show_once boolean not null default false,
  dismissible boolean not null default true,
  requires_acknowledgement boolean not null default false,
  status text not null default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  published_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid not null references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_announcements_title_length
    check (char_length(btrim(title)) between 3 and 150),
  constraint platform_announcements_message_length
    check (char_length(btrim(message)) between 3 and 5000),
  constraint platform_announcements_type_check
    check (announcement_type in (
      'information',
      'system_update',
      'maintenance',
      'billing',
      'urgent',
      'campaign'
    )),
  constraint platform_announcements_priority_check
    check (priority in ('normal', 'important', 'urgent')),
  constraint platform_announcements_audience_check
    check (audience_type in (
      'all',
      'organizations',
      'subscription_overdue',
      'subscription_trial'
    )),
  constraint platform_announcements_status_check
    check (status in ('draft', 'scheduled', 'published', 'expired', 'cancelled')),
  constraint platform_announcements_channels_check
    check (
      cardinality(display_channels) > 0
      and display_channels <@ array[
        'notification_center',
        'login_modal',
        'dashboard_banner',
        'dashboard_card'
      ]::text[]
    ),
  constraint platform_announcements_period_check
    check (ends_at is null or starts_at is null or ends_at > starts_at),
  constraint platform_announcements_action_check
    check (
      (action_label is null and action_url is null)
      or (
        char_length(btrim(coalesce(action_label, ''))) between 2 and 50
        and char_length(btrim(coalesce(action_url, ''))) between 1 and 500
      )
    )
);

create table if not exists public.platform_announcement_recipients (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null
    references public.platform_announcements(id) on delete cascade,
  organization_id uuid not null references public.organizations(id),
  created_at timestamptz not null default now(),
  unique (announcement_id, organization_id)
);

create table if not exists public.platform_announcement_receipts (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null
    references public.platform_announcements(id) on delete cascade,
  organization_id uuid not null references public.organizations(id),
  profile_id uuid not null references public.profiles(id),
  first_seen_at timestamptz,
  last_displayed_at timestamptz,
  read_at timestamptz,
  acknowledged_at timestamptz,
  dismissed_at timestamptz,
  display_count integer not null default 0 check (display_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (announcement_id, profile_id)
);

create index if not exists platform_announcements_delivery_idx
  on public.platform_announcements(status, starts_at, ends_at);

create index if not exists platform_announcements_created_idx
  on public.platform_announcements(created_at desc);

create index if not exists platform_announcement_recipients_org_idx
  on public.platform_announcement_recipients(organization_id, announcement_id);

create index if not exists platform_announcement_receipts_profile_idx
  on public.platform_announcement_receipts(profile_id, read_at, announcement_id);

drop trigger if exists set_updated_at on public.platform_announcements;
create trigger set_updated_at
before update on public.platform_announcements
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.platform_announcement_receipts;
create trigger set_updated_at
before update on public.platform_announcement_receipts
for each row execute function public.set_updated_at();

create or replace function public.can_receive_platform_announcement(
  target_announcement_id uuid,
  target_organization_id uuid default public.current_organization_id()
)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    public.is_super_admin()
    or exists (
      select 1
      from public.platform_announcements announcement
      where announcement.id = target_announcement_id
        and announcement.status in ('scheduled', 'published')
        and coalesce(announcement.starts_at, announcement.published_at, announcement.created_at) <= now()
        and (announcement.ends_at is null or announcement.ends_at > now())
        and (
          announcement.audience_type = 'all'
          or exists (
            select 1
            from public.platform_announcement_recipients recipient
            where recipient.announcement_id = announcement.id
              and recipient.organization_id = target_organization_id
          )
        )
    ),
    false
  )
$$;

revoke all on function public.can_receive_platform_announcement(uuid, uuid) from public;
grant execute on function public.can_receive_platform_announcement(uuid, uuid) to authenticated;

alter table public.platform_announcements enable row level security;
alter table public.platform_announcement_recipients enable row level security;
alter table public.platform_announcement_receipts enable row level security;

drop policy if exists platform_announcements_admin_all on public.platform_announcements;
create policy platform_announcements_admin_all
on public.platform_announcements
for all
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists platform_announcements_recipient_read on public.platform_announcements;
create policy platform_announcements_recipient_read
on public.platform_announcements
for select
using (public.can_receive_platform_announcement(id));

drop policy if exists platform_announcement_recipients_admin_all
  on public.platform_announcement_recipients;
create policy platform_announcement_recipients_admin_all
on public.platform_announcement_recipients
for all
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists platform_announcement_recipients_org_read
  on public.platform_announcement_recipients;
create policy platform_announcement_recipients_org_read
on public.platform_announcement_recipients
for select
using (
  organization_id = public.current_organization_id()
  and public.can_receive_platform_announcement(announcement_id, organization_id)
);

drop policy if exists platform_announcement_receipts_admin_read
  on public.platform_announcement_receipts;
create policy platform_announcement_receipts_admin_read
on public.platform_announcement_receipts
for select
using (public.is_super_admin());

drop policy if exists platform_announcement_receipts_self_read
  on public.platform_announcement_receipts;
create policy platform_announcement_receipts_self_read
on public.platform_announcement_receipts
for select
using (
  profile_id = auth.uid()
  and organization_id = public.current_organization_id()
);

drop policy if exists platform_announcement_receipts_self_insert
  on public.platform_announcement_receipts;
create policy platform_announcement_receipts_self_insert
on public.platform_announcement_receipts
for insert
with check (
  profile_id = auth.uid()
  and organization_id = public.current_organization_id()
  and public.can_receive_platform_announcement(announcement_id, organization_id)
);

drop policy if exists platform_announcement_receipts_self_update
  on public.platform_announcement_receipts;
create policy platform_announcement_receipts_self_update
on public.platform_announcement_receipts
for update
using (
  profile_id = auth.uid()
  and organization_id = public.current_organization_id()
)
with check (
  profile_id = auth.uid()
  and organization_id = public.current_organization_id()
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'platform-announcements',
  'platform-announcements',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists platform_announcements_storage_admin_read on storage.objects;
create policy platform_announcements_storage_admin_read
on storage.objects
for select
using (
  bucket_id = 'platform-announcements'
  and public.is_super_admin()
);

drop policy if exists platform_announcements_storage_recipient_read on storage.objects;
create policy platform_announcements_storage_recipient_read
on storage.objects
for select
using (
  bucket_id = 'platform-announcements'
  and exists (
    select 1
    from public.platform_announcements announcement
    where announcement.image_path = name
      and public.can_receive_platform_announcement(announcement.id)
  )
);

drop policy if exists platform_announcements_storage_admin_insert on storage.objects;
create policy platform_announcements_storage_admin_insert
on storage.objects
for insert
with check (
  bucket_id = 'platform-announcements'
  and public.is_super_admin()
);

drop policy if exists platform_announcements_storage_admin_update on storage.objects;
create policy platform_announcements_storage_admin_update
on storage.objects
for update
using (
  bucket_id = 'platform-announcements'
  and public.is_super_admin()
)
with check (
  bucket_id = 'platform-announcements'
  and public.is_super_admin()
);

drop policy if exists platform_announcements_storage_admin_delete on storage.objects;
create policy platform_announcements_storage_admin_delete
on storage.objects
for delete
using (
  bucket_id = 'platform-announcements'
  and public.is_super_admin()
);

comment on table public.platform_announcements is
  'Comunicados criados pelo Super Admin para exibição nos ambientes dos Espaços.';

comment on table public.platform_announcement_recipients is
  'Organizações destinatárias de comunicados segmentados.';

comment on table public.platform_announcement_receipts is
  'Visualização, leitura, confirmação e descarte dos comunicados por usuário.';
