import { getSupabase } from "@/integrations/supabase/client";
import type { AccessTemplate, AccessTemplateKey, Profile } from "@/types/database";

export type TeamUserInput = {
  fullName: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  accessTemplate: AccessTemplateKey;
  delivery?: "invite" | "temporary_password";
};

export type AccessCredentials = {
  email: string;
  temporaryPassword?: string;
  delivery?: "invite" | "temporary_password";
  expiresInDays?: number;
};

async function invoke<T>(body: Record<string, unknown>) {
  const { data, error } = await getSupabase().functions.invoke("manage-team-user", { body });
  if (error) {
    let message = error.message;
    try {
      const response = error.context as Response | undefined;
      const payload = response ? await response.clone().json() : null;
      if (payload?.error) message = payload.error;
    } catch {
      // Mantém a mensagem original quando a resposta não contém JSON.
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export async function listTeamUsers() {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("*")
    .is("deleted_at", null)
    .order("is_organization_admin", { ascending: false })
    .order("full_name");
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function listAccessTemplates() {
  const { data, error } = await getSupabase()
    .from("access_templates")
    .select("*")
    .eq("active", true)
    .order("name");
  if (error) throw error;
  return (data ?? []) as AccessTemplate[];
}

export function createTeamUser(input: TeamUserInput) {
  return invoke<AccessCredentials>({
    action: "create",
    ...input,
  });
}

export function updateTeamUser(userId: string, input: TeamUserInput) {
  return invoke<{ success: true }>({
    action: "update",
    userId,
    ...input,
  });
}

export function setTeamUserStatus(userId: string, active: boolean) {
  return invoke<{ success: true }>({ action: "set_status", userId, active });
}

export function resetTeamUserAccess(userId: string) {
  return invoke<AccessCredentials>({ action: "reset_access", userId });
}

export function promoteTeamUser(userId: string) {
  return invoke<{ success: true }>({ action: "promote_administrator", userId });
}
