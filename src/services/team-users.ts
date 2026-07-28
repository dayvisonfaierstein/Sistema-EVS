import { getSupabase } from "@/integrations/supabase/client";
import type { AccessTemplate, AccessTemplateKey, Permission, Profile } from "@/types/database";

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

export async function getTeamUser(userId: string) {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .is("deleted_at", null)
    .single();
  if (error) throw error;
  return data as Profile;
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

export async function listPermissionCatalog() {
  const { data, error } = await getSupabase()
    .from("permissions")
    .select("*")
    .eq("active", true)
    .order("module")
    .order("name");
  if (error) throw error;
  return (data ?? []) as Permission[];
}

export async function getUserPermissionKeys(userId: string) {
  const { data, error } = await getSupabase()
    .from("user_permissions")
    .select("granted,permission:permissions(key)")
    .eq("user_id", userId)
    .eq("granted", true);
  if (error) throw error;
  return (data ?? [])
    .map((item) => {
      const permission = item.permission as unknown as { key: string } | null;
      return permission?.key;
    })
    .filter((key): key is string => Boolean(key))
    .sort();
}

export async function getTemplatePermissionKeys(templateKey: AccessTemplateKey) {
  const { data, error } = await getSupabase().rpc("get_template_permissions", {
    requested_template_key: templateKey,
  });
  if (error) throw error;
  return (data ?? []).map((item: { permission_key: string }) => item.permission_key).sort();
}

export async function saveUserPermissions(
  userId: string,
  permissionKeys: string[],
  templateKey: AccessTemplateKey,
) {
  const { error } = await getSupabase().rpc("set_user_permissions", {
    target_user_id: userId,
    permission_keys: permissionKeys,
    selected_template_key: templateKey,
  });
  if (error) throw error;
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
