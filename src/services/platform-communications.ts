import { getSupabase } from "@/integrations/supabase/client";

export type AnnouncementStatus = "draft" | "scheduled" | "published" | "expired" | "cancelled";
export type AnnouncementPriority = "normal" | "important" | "urgent";
export type AnnouncementAudience =
  | "all"
  | "organizations"
  | "subscription_overdue"
  | "subscription_trial";
export type AnnouncementChannel =
  | "notification_center"
  | "login_modal"
  | "dashboard_banner"
  | "dashboard_card";

export type PlatformAnnouncement = {
  id: string;
  title: string;
  message: string;
  announcement_type: string;
  priority: AnnouncementPriority;
  audience_type: AnnouncementAudience;
  display_channels: AnnouncementChannel[];
  image_path: string | null;
  action_label: string | null;
  action_url: string | null;
  show_once: boolean;
  dismissible: boolean;
  requires_acknowledgement: boolean;
  status: AnnouncementStatus;
  starts_at: string | null;
  ends_at: string | null;
  published_at: string | null;
  created_at: string;
};

export type AnnouncementReceipt = {
  announcement_id: string;
  first_seen_at: string | null;
  last_displayed_at: string | null;
  read_at: string | null;
  acknowledged_at: string | null;
  dismissed_at: string | null;
  display_count: number;
};

export type ReceivedAnnouncement = PlatformAnnouncement & {
  receipt: AnnouncementReceipt | null;
  image_url: string | null;
};

export type AnnouncementMetric = {
  announcement_id: string;
  recipient_organizations: number;
  reached_users: number;
  read_users: number;
  acknowledged_users: number;
  dismissed_users: number;
  total_displays: number;
};

export type AnnouncementInput = Omit<
  PlatformAnnouncement,
  "id" | "image_path" | "status" | "published_at" | "created_at"
>;

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function listPlatformAnnouncements() {
  const { data, error } = await getSupabase()
    .from("platform_announcements")
    .select("*")
    .order("created_at", { ascending: false });
  fail(error);
  return (data ?? []) as PlatformAnnouncement[];
}

export async function createPlatformAnnouncement(input: AnnouncementInput, image?: File | null) {
  const supabase = getSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sessão não encontrada.");
  const { data, error } = await supabase
    .from("platform_announcements")
    .insert({
      ...input,
      starts_at: input.starts_at || null,
      ends_at: input.ends_at || null,
      action_label: input.action_label?.trim() || null,
      action_url: input.action_url?.trim() || null,
      created_by: auth.user.id,
      updated_by: auth.user.id,
    })
    .select("*")
    .single();
  fail(error);

  if (image) {
    const extension =
      image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg";
    const path = `${data.id}/card.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("platform-announcements")
      .upload(path, image, { contentType: image.type, upsert: true });
    if (uploadError) {
      await supabase.from("platform_announcements").delete().eq("id", data.id);
      throw new Error(uploadError.message);
    }
    const { error: updateError } = await supabase
      .from("platform_announcements")
      .update({ image_path: path })
      .eq("id", data.id);
    fail(updateError);
  }
  return data as PlatformAnnouncement;
}

export async function publishPlatformAnnouncement(id: string, organizationIds: string[]) {
  const { error } = await getSupabase().rpc("admin_publish_platform_announcement", {
    target_announcement_id: id,
    target_organization_ids: organizationIds,
  });
  fail(error);
}

export async function updatePlatformAnnouncement(
  id: string,
  input: AnnouncementInput,
  image?: File | null,
) {
  const supabase = getSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sessão não encontrada.");
  const { error } = await supabase
    .from("platform_announcements")
    .update({
      ...input,
      starts_at: input.starts_at || null,
      ends_at: input.ends_at || null,
      action_label: input.action_label?.trim() || null,
      action_url: input.action_url?.trim() || null,
      updated_by: auth.user.id,
    })
    .eq("id", id);
  fail(error);
  if (image) {
    const extension =
      image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg";
    const path = `${id}/card.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("platform-announcements")
      .upload(path, image, { contentType: image.type, upsert: true });
    fail(uploadError);
    const { error: imageError } = await supabase
      .from("platform_announcements")
      .update({ image_path: path })
      .eq("id", id);
    fail(imageError);
  }
}

export async function cancelPlatformAnnouncement(id: string) {
  const { error } = await getSupabase().rpc("admin_cancel_platform_announcement", {
    target_announcement_id: id,
  });
  fail(error);
}

export async function listAnnouncementMetrics(): Promise<AnnouncementMetric[]> {
  const { data, error } = await getSupabase().rpc("admin_platform_announcement_metrics");
  fail(error);
  return ((data ?? []) as AnnouncementMetric[]).map((item) => ({
    ...item,
    recipient_organizations: Number(item.recipient_organizations),
    reached_users: Number(item.reached_users),
    read_users: Number(item.read_users),
    acknowledged_users: Number(item.acknowledged_users),
    dismissed_users: Number(item.dismissed_users),
    total_displays: Number(item.total_displays),
  }));
}

export async function listAnnouncementRecipientIds(id: string) {
  const { data, error } = await getSupabase()
    .from("platform_announcement_recipients")
    .select("organization_id")
    .eq("announcement_id", id);
  fail(error);
  return (data ?? []).map((item: { organization_id: string }) => item.organization_id);
}

export async function listReceivedAnnouncements(): Promise<ReceivedAnnouncement[]> {
  const supabase = getSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase.rpc("get_my_platform_announcements");
  fail(error);
  const announcements = (Array.isArray(data) ? data : []) as Array<
    PlatformAnnouncement & { receipt: AnnouncementReceipt | null }
  >;
  return Promise.all(
    announcements.map(async (announcement) => {
      let imageUrl: string | null = null;
      if (announcement.image_path) {
        const { data } = await supabase.storage
          .from("platform-announcements")
          .createSignedUrl(announcement.image_path, 3600);
        imageUrl = data?.signedUrl ?? null;
      }
      return {
        ...announcement,
        receipt: announcement.receipt ?? null,
        image_url: imageUrl,
      };
    }),
  );
}

export async function recordAnnouncementEvent(
  id: string,
  event: "displayed" | "read" | "acknowledged" | "dismissed",
) {
  const { error } = await getSupabase().rpc("record_platform_announcement_event", {
    target_announcement_id: id,
    target_event: event,
  });
  fail(error);
}
