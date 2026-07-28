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
