import { getSupabase } from "@/integrations/supabase/client";
import type {
  Organization,
  Plan,
  PlanBillingInterval,
  Subscription,
  SubscriptionPayment,
  SubscriptionStatus,
} from "@/types/database";

const monthStart = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
};

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export type AdminAlert = {
  id: string;
  tone: "warning" | "destructive" | "info";
  title: string;
  description: string;
  href: string;
};

export type AdminDashboardMetrics = {
  organizations: {
    total: number;
    active: number;
    pending: number;
    blocked: number;
    cancelled: number;
  };
  subscriptions: { active: number; overdue: number };
  monthlyRecurringRevenue: number;
  newOrganizations: number;
  cancellations: number;
  users: number;
  clients: number;
  alerts: AdminAlert[];
};

export async function getAdminDashboardMetrics(): Promise<AdminDashboardMetrics> {
  const supabase = getSupabase();
  const count = async (table: string, filters: Record<string, string> = {}) => {
    let query = supabase.from(table).select("*", { count: "exact", head: true });
    for (const [column, value] of Object.entries(filters)) query = query.eq(column, value);
    const { count: result, error } = await query;
    throwIfError(error);
    return result ?? 0;
  };

  const [
    organizationsTotal,
    organizationsActive,
    organizationsPending,
    organizationsBlocked,
    organizationsCancelled,
    subscriptionsActive,
    subscriptionsOverdue,
    users,
    clients,
    newOrganizationsResult,
    cancellationsResult,
    recurringResult,
    overduePayments,
    graceSubscriptions,
  ] = await Promise.all([
    count("organizations"),
    count("organizations", { status: "active" }),
    count("organizations", { status: "pending" }),
    count("organizations", { status: "blocked" }),
    count("organizations", { status: "cancelled" }),
    count("subscriptions", { status: "active" }),
    count("subscriptions", { status: "overdue" }),
    count("profiles"),
    count("clients"),
    supabase
      .from("organizations")
      .select("*", { count: "exact", head: true })
      .gte("created_at", monthStart()),
    supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .gte("cancelled_at", monthStart()),
    supabase
      .from("subscriptions")
      .select("price_snapshot,billing_interval,interval_count")
      .in("status", ["active", "overdue", "grace_period"]),
    count("subscription_payments", { status: "overdue" }),
    count("subscriptions", { status: "grace_period" }),
  ]);

  throwIfError(newOrganizationsResult.error);
  throwIfError(cancellationsResult.error);
  throwIfError(recurringResult.error);

  const intervalMonths: Record<PlanBillingInterval, number> = {
    monthly: 1,
    quarterly: 3,
    semiannual: 6,
    annual: 12,
  };
  const monthlyRecurringRevenue = (recurringResult.data ?? []).reduce(
    (total, item) =>
      total +
      Number(item.price_snapshot) /
        (intervalMonths[item.billing_interval as PlanBillingInterval] *
          Number(item.interval_count || 1)),
    0,
  );

  const alerts: AdminAlert[] = [];
  if (overduePayments)
    alerts.push({
      id: "overdue-payments",
      tone: "destructive",
      title: `${overduePayments} mensalidade(s) vencida(s)`,
      description: "Há cobranças que precisam de conferência ou baixa manual.",
      href: "/admin/assinaturas",
    });
  if (graceSubscriptions)
    alerts.push({
      id: "grace-subscriptions",
      tone: "warning",
      title: `${graceSubscriptions} assinatura(s) em carência`,
      description: "Revise os espaços antes do bloqueio.",
      href: "/admin/assinaturas",
    });
  if (organizationsPending)
    alerts.push({
      id: "pending-organizations",
      tone: "info",
      title: `${organizationsPending} espaço(s) pendente(s)`,
      description: "Organizações aguardando ativação ou definição de plano.",
      href: "/admin/organizacoes",
    });

  return {
    organizations: {
      total: organizationsTotal,
      active: organizationsActive,
      pending: organizationsPending,
      blocked: organizationsBlocked,
      cancelled: organizationsCancelled,
    },
    subscriptions: { active: subscriptionsActive, overdue: subscriptionsOverdue },
    monthlyRecurringRevenue,
    newOrganizations: newOrganizationsResult.count ?? 0,
    cancellations: cancellationsResult.count ?? 0,
    users,
    clients,
    alerts,
  };
}

export async function listAdminOrganizations() {
  const { data, error } = await getSupabase()
    .from("organizations")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  throwIfError(error);
  return (data ?? []) as Organization[];
}

export type AdminOrganizationInput = Pick<
  Organization,
  | "legal_name"
  | "trade_name"
  | "document"
  | "legal_document_type"
  | "phone"
  | "whatsapp"
  | "email"
  | "address"
  | "address_number"
  | "address_complement"
  | "neighborhood"
  | "city"
  | "state"
  | "postal_code"
  | "responsible_name"
  | "responsible_phone"
  | "responsible_whatsapp"
  | "responsible_email"
>;

export async function updateAdminOrganization(id: string, input: AdminOrganizationInput) {
  const payload = {
    ...input,
    legal_name: input.legal_name.trim(),
    trade_name: input.trade_name.trim(),
    document: input.document?.replace(/\D/g, "") || null,
    legal_document_type: input.legal_document_type?.trim() || null,
    phone: input.phone?.trim() || null,
    whatsapp: input.whatsapp?.trim() || null,
    email: input.email?.trim().toLowerCase() || null,
    address: input.address?.trim() || null,
    address_number: input.address_number?.trim() || null,
    address_complement: input.address_complement?.trim() || null,
    neighborhood: input.neighborhood?.trim() || null,
    city: input.city?.trim() || null,
    state: input.state?.trim().toUpperCase() || null,
    postal_code: input.postal_code?.trim() || null,
    responsible_name: input.responsible_name?.trim() || null,
    responsible_phone: input.responsible_phone?.trim() || null,
    responsible_whatsapp: input.responsible_whatsapp?.trim() || null,
    responsible_email: input.responsible_email?.trim().toLowerCase() || null,
  };
  const { data, error } = await getSupabase()
    .from("organizations")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  throwIfError(error);
  if (!data) throw new Error("O Supabase não confirmou a atualização da organização.");
  return data as Organization;
}

export type ProvisionOrganizationInput = {
  legalName: string;
  tradeName: string;
  document?: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  adminName: string;
  adminEmail: string;
  delivery: "invite" | "temporary_password";
};

export type ProvisionOrganizationResult = {
  organizationId: string;
  organizationName: string;
  adminEmail: string;
  delivery: ProvisionOrganizationInput["delivery"];
  temporaryPassword?: string;
  expiresInDays: number;
};

export async function provisionAdminOrganization(input: ProvisionOrganizationInput) {
  const { data, error } = await getSupabase().functions.invoke("provision-organization", {
    body: input,
  });
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
  return data as ProvisionOrganizationResult;
}

export async function listAdminPlans() {
  const { data, error } = await getSupabase()
    .from("plans")
    .select("*")
    .order("sort_order")
    .order("name");
  throwIfError(error);
  return (data ?? []) as Plan[];
}

export type PlanInput = Pick<
  Plan,
  | "code"
  | "name"
  | "description"
  | "price"
  | "billing_interval"
  | "trial_days"
  | "grace_days"
  | "active"
>;

export async function saveAdminPlan(input: PlanInput, id?: string) {
  const payload = {
    ...input,
    code: input.code.trim().toLowerCase(),
    name: input.name.trim(),
    description: input.description?.trim() || null,
    price: Number(input.price),
    trial_days: Number(input.trial_days),
    grace_days: Number(input.grace_days),
  };
  const query = id
    ? getSupabase().from("plans").update(payload).eq("id", id).select().single()
    : getSupabase().from("plans").insert(payload).select().single();
  const { data, error } = await query;
  throwIfError(error);
  if (!data) throw new Error("O Supabase não confirmou o salvamento do plano.");
  return data as Plan;
}

export type AdminSubscription = Subscription & {
  plan: Pick<Plan, "id" | "name" | "code"> | null;
  organization: Pick<Organization, "id" | "trade_name" | "legal_name"> | null;
};

export async function listAdminSubscriptions() {
  const { data, error } = await getSupabase()
    .from("subscriptions")
    .select("*,plan:plans(id,name,code),organization:organizations(id,trade_name,legal_name)")
    .order("created_at", { ascending: false });
  throwIfError(error);
  return (data ?? []) as AdminSubscription[];
}

export async function createAdminSubscription(input: {
  organizationId: string;
  planId: string;
  startsOn: string;
  dueDay: number;
  priceOverride?: number;
  notes?: string;
}) {
  const { error } = await getSupabase().rpc("admin_create_subscription", {
    p_organization_id: input.organizationId,
    p_plan_id: input.planId,
    p_starts_on: input.startsOn,
    p_due_day: input.dueDay,
    p_price_override: input.priceOverride ?? null,
    p_notes: input.notes ?? null,
  });
  throwIfError(error);
}

export async function setAdminSubscriptionStatus(
  subscriptionId: string,
  status: SubscriptionStatus,
  reason?: string,
) {
  const { error } = await getSupabase().rpc("admin_set_subscription_status", {
    p_subscription_id: subscriptionId,
    p_status: status,
    p_reason: reason ?? null,
  });
  throwIfError(error);
}

export async function listSubscriptionPayments(subscriptionId?: string) {
  let query = getSupabase()
    .from("subscription_payments")
    .select("*")
    .order("due_date", { ascending: false });
  if (subscriptionId) query = query.eq("subscription_id", subscriptionId);
  const { data, error } = await query;
  throwIfError(error);
  return (data ?? []) as SubscriptionPayment[];
}

export async function createAdminSubscriptionPayment(input: {
  subscriptionId: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  amount?: number;
  notes?: string;
}) {
  const { error } = await getSupabase().rpc("admin_create_subscription_payment", {
    p_subscription_id: input.subscriptionId,
    p_reference_period_start: input.periodStart,
    p_reference_period_end: input.periodEnd,
    p_due_date: input.dueDate,
    p_amount: input.amount ?? null,
    p_notes: input.notes ?? null,
  });
  throwIfError(error);
}

export async function registerAdminSubscriptionPayment(paymentId: string, paymentMethod: string) {
  const { error } = await getSupabase().rpc("admin_register_subscription_payment", {
    p_payment_id: paymentId,
    p_paid_at: new Date().toISOString(),
    p_paid_amount: null,
    p_payment_method: paymentMethod || null,
    p_payment_reference: null,
    p_receipt_url: null,
    p_notes: null,
  });
  throwIfError(error);
}

export type AdminAuditLog = {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
  organization: Pick<Organization, "trade_name"> | null;
  user: { full_name: string; email: string } | null;
};

export async function listAdminAuditLogs() {
  const { data, error } = await getSupabase()
    .from("audit_logs")
    .select("*,organization:organizations(trade_name),user:profiles(full_name,email)")
    .order("created_at", { ascending: false })
    .limit(250);
  throwIfError(error);
  return (data ?? []) as AdminAuditLog[];
}
