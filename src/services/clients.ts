import { getSupabase } from "@/integrations/supabase/client";
import type { Client } from "@/types/database";

export async function listClients(search = "", page = 0, pageSize = 20) {
  let query = getSupabase()
    .from("clients")
    .select("*", { count: "exact" })
    .order("full_name")
    .range(page * pageSize, (page + 1) * pageSize - 1);
  if (search.trim()) query = query.ilike("full_name", `%${search.trim()}%`);
  const { data, count, error } = await query;
  if (error) throw error;
  return { clients: (data ?? []) as Client[], count: count ?? 0 };
}

export async function createClient(input: Partial<Client>, photo?: File | null) {
  const supabase = getSupabase();
  const { data: profile } = await supabase.from("profiles").select("organization_id").single();
  if (!profile?.organization_id) throw new Error("Organização do usuário não encontrada.");
  const payload = {
    ...input,
    organization_id: profile.organization_id,
    cpf: input.cpf?.replace(/\D/g, "") || null,
  };
  const { data, error } = await supabase.from("clients").insert(payload).select().single();
  if (error) throw error;
  if (photo) {
    if (photo.type !== "image/jpeg" || photo.size > 2 * 1024 * 1024)
      throw new Error("A foto processada é inválida ou excede 2 MB.");
    const path = `${profile.organization_id}/${data.id}/profile/${crypto.randomUUID()}.jpg`;
    const upload = await supabase.storage
      .from("client-photos")
      .upload(path, photo, { contentType: "image/jpeg", cacheControl: "31536000" });
    if (upload.error) throw upload.error;
    const photoUpdate = await supabase
      .from("clients")
      .update({ photo_url: path })
      .eq("id", data.id);
    if (photoUpdate.error) throw photoUpdate.error;
  }
  return data as Client;
}

async function uploadClientPhoto(organizationId: string, clientId: string, photo: File) {
  if (photo.type !== "image/jpeg" || photo.size > 2 * 1024 * 1024)
    throw new Error("A foto processada é inválida ou excede 2 MB.");
  const path = `${organizationId}/${clientId}/profile/${crypto.randomUUID()}.jpg`;
  const upload = await getSupabase()
    .storage.from("client-photos")
    .upload(path, photo, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (upload.error) throw upload.error;
  return path;
}

export async function updateClient(
  id: string,
  input: Partial<Client>,
  options?: { photo?: File | null; removePhoto?: boolean; currentPhotoPath?: string | null },
) {
  const supabase = getSupabase();
  const { data: current, error: currentError } = await supabase
    .from("clients")
    .select("organization_id, photo_url")
    .eq("id", id)
    .single();
  if (currentError) throw currentError;

  let newPhotoPath: string | null | undefined;
  if (options?.photo) {
    newPhotoPath = await uploadClientPhoto(current.organization_id, id, options.photo);
  } else if (options?.removePhoto) {
    newPhotoPath = null;
  }

  const payload = {
    ...input,
    cpf: input.cpf?.replace(/\D/g, "") || null,
    ...(newPhotoPath !== undefined ? { photo_url: newPhotoPath } : {}),
  };
  const { data, error } = await supabase
    .from("clients")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    if (newPhotoPath) await supabase.storage.from("client-photos").remove([newPhotoPath]);
    throw error;
  }

  const oldPhotoPath = options?.currentPhotoPath ?? current.photo_url;
  if (oldPhotoPath && newPhotoPath !== undefined && oldPhotoPath !== newPhotoPath) {
    await supabase.storage.from("client-photos").remove([oldPhotoPath]);
  }
  return data as Client;
}

export async function getClientPhotoUrl(path?: string | null) {
  if (!path) return null;
  const { data, error } = await getSupabase()
    .storage.from("client-photos")
    .createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function getClient(id: string) {
  const { data, error } = await getSupabase().from("clients").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Client;
}
