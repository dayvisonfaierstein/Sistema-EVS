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
    if (!photo.type.startsWith("image/") || photo.size > 5 * 1024 * 1024)
      throw new Error("A foto deve ser uma imagem de até 5 MB.");
    const path = `${profile.organization_id}/${data.id}/profile/${crypto.randomUUID()}-${photo.name}`;
    const upload = await supabase.storage.from("client-photos").upload(path, photo);
    if (upload.error) throw upload.error;
    await supabase.from("clients").update({ photo_url: path }).eq("id", data.id);
  }
  return data as Client;
}

export async function updateClient(id: string, input: Partial<Client>) {
  const payload = { ...input, cpf: input.cpf?.replace(/\D/g, "") || null };
  const { data, error } = await getSupabase()
    .from("clients")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Client;
}

export async function getClient(id: string) {
  const { data, error } = await getSupabase().from("clients").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Client;
}
