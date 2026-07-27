import { getSupabase } from "@/integrations/supabase/client";
import type {
  Assessment,
  ClientReferral,
  ExperiencePlan,
  ExperiencePlanDay,
} from "@/types/database";

async function currentContext() {
  const supabase = getSupabase();
  const [{ data: profile }, { data: userData }] = await Promise.all([
    supabase.from("profiles").select("organization_id, full_name").single(),
    supabase.auth.getUser(),
  ]);
  if (!profile?.organization_id) throw new Error("Organização do usuário não encontrada.");
  return {
    supabase,
    organizationId: profile.organization_id as string,
    evaluatorId: userData.user?.id ?? null,
    evaluatorName: profile.full_name as string,
  };
}

export async function listAssessments(clientId?: string) {
  let query = getSupabase()
    .from("assessments")
    .select("*")
    .order("assessment_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (clientId) query = query.eq("client_id", clientId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Assessment[];
}

export async function getAssessment(id: string) {
  const { data, error } = await getSupabase()
    .from("assessments")
    .select("*, clients(full_name, birth_date, gender, phone, photo_url)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Assessment & {
    clients: {
      full_name: string;
      birth_date: string | null;
      gender: string | null;
      phone: string | null;
      photo_url: string | null;
    };
  };
}

export async function createAssessment(input: Partial<Assessment> & { client_id: string }) {
  const { supabase, organizationId, evaluatorId, evaluatorName } = await currentContext();
  const height = input.height && input.height > 3 ? input.height / 100 : input.height;
  const { bmi: _databaseGenerated, ...values } = input;
  const { data, error } = await supabase
    .from("assessments")
    .insert({
      ...values,
      height,
      organization_id: organizationId,
      evaluator_id: evaluatorId,
      evaluator_name: evaluatorName,
    })
    .select()
    .single();
  if (error) throw error;
  if (height) {
    await supabase.from("clients").update({ height }).eq("id", input.client_id);
  }
  return data as Assessment;
}

export async function listExperiencePlans(clientId: string) {
  const { data, error } = await getSupabase()
    .from("experience_plans")
    .select("*, experience_plan_days(*)")
    .eq("client_id", clientId)
    .order("started_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ExperiencePlan[];
}

export async function createExperiencePlan(clientId: string, startDate: string) {
  const { supabase, organizationId, evaluatorId } = await currentContext();
  const { data: plan, error } = await supabase
    .from("experience_plans")
    .insert({
      client_id: clientId,
      organization_id: organizationId,
      started_at: startDate,
      created_by: evaluatorId,
    })
    .select()
    .single();
  if (error) throw error;
  const start = new Date(`${startDate}T12:00:00`);
  const days = Array.from({ length: 3 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      organization_id: organizationId,
      plan_id: plan.id,
      day_number: index + 1,
      plan_date: date.toISOString().slice(0, 10),
    };
  });
  const inserted = await supabase.from("experience_plan_days").insert(days);
  if (inserted.error) throw inserted.error;
  return plan as ExperiencePlan;
}

export async function updateExperienceDay(
  id: string,
  input: Partial<Omit<ExperiencePlanDay, "id" | "plan_id" | "day_number">>,
) {
  const { data, error } = await getSupabase()
    .from("experience_plan_days")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as ExperiencePlanDay;
}

export async function listReferrals(clientId: string) {
  const { data, error } = await getSupabase()
    .from("client_referrals")
    .select("*")
    .eq("referring_client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ClientReferral[];
}

export async function createReferral(
  clientId: string,
  input: Pick<ClientReferral, "name" | "phone" | "city" | "relationship" | "notes">,
) {
  const { supabase, organizationId, evaluatorId } = await currentContext();
  const { data, error } = await supabase
    .from("client_referrals")
    .insert({
      ...input,
      referring_client_id: clientId,
      organization_id: organizationId,
      created_by: evaluatorId,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ClientReferral;
}
