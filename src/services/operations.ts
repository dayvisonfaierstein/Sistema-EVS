import { getSupabase } from "@/integrations/supabase/client";
import type { Access, Assessment } from "@/types/database";

export async function listTodayAccesses() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { data, error } = await getSupabase()
    .from("accesses")
    .select("*, clients(full_name, photo_url)")
    .gte("accessed_at", start.toISOString())
    .order("accessed_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as Access[];
}

export async function registerAccess(input: {
  client_id: string;
  access_type: string;
  service_performed?: string;
  notes?: string;
}) {
  const { data, error } = await getSupabase().rpc("register_client_access", {
    p_client_id: input.client_id,
    p_access_type: input.access_type,
    p_service_performed: input.service_performed,
    p_notes: input.notes,
  });
  if (error) throw error;
  return data;
}

export async function listAssessments(clientId?: string) {
  let query = getSupabase()
    .from("assessments")
    .select("*")
    .order("assessment_date", { ascending: false });
  if (clientId) query = query.eq("client_id", clientId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Assessment[];
}

export async function createAssessment(input: Partial<Assessment> & { client_id: string }) {
  const supabase = getSupabase();
  const { data: profile } = await supabase.from("profiles").select("organization_id").single();
  if (!profile?.organization_id) throw new Error("Organização do usuário não encontrada.");
  const heightM = input.height && input.height > 3 ? input.height / 100 : input.height;
  const { bmi: _calculatedByDatabase, ...values } = input;
  const { data, error } = await supabase
    .from("assessments")
    .insert({
      ...values,
      organization_id: profile.organization_id,
      evaluator_id: (await supabase.auth.getUser()).data.user?.id,
      height: heightM,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Assessment;
}
