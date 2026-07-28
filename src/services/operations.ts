import { getSupabase } from "@/integrations/supabase/client";
import type { Access, AccessConsumption, Assessment, ConsumptionItem } from "@/types/database";

export type ClientConsumptionHistory = AccessConsumption & {
  accesses: { accessed_at: string; service_performed: string | null } | null;
  consumption_items: Pick<
    ConsumptionItem,
    "id" | "product_name_snapshot" | "quantity" | "unit" | "cost_total" | "pv_total"
  >[];
};

export async function listTodayAccesses() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { data, error } = await getSupabase()
    .from("accesses")
    .select(
      "*, clients(full_name, photo_url), access_consumptions(id,item_name_snapshot,quantity,cost_total,pv_total,consumption_type)",
    )
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
  consumption_type?: "none" | "recipe" | "product";
  item_id?: string | null;
  quantity?: number;
}) {
  const { data, error } = await getSupabase().rpc("register_access_with_consumption", {
    p_client_id: input.client_id,
    p_access_type: input.access_type,
    p_service_performed: input.service_performed,
    p_notes: input.notes,
    p_consumption_type: input.consumption_type ?? "none",
    p_item_id: input.item_id ?? null,
    p_quantity: input.quantity ?? 1,
  });
  if (error) throw error;
  return data;
}

export async function listClientConsumptions(clientId: string) {
  const { data, error } = await getSupabase()
    .from("access_consumptions")
    .select(
      "*, accesses(accessed_at,service_performed), consumption_items(id,product_name_snapshot,quantity,unit,cost_total,pv_total)",
    )
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ClientConsumptionHistory[];
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
