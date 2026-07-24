import { getSupabase } from "@/integrations/supabase/client";

export async function getDashboardMetrics() {
  const db = getSupabase();
  const now = new Date(),
    month = new Date(now.getFullYear(), now.getMonth(), 1),
    day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [active, newClients, todayAccess, monthAccess, assessments, income, expenses, lowStock] =
    await Promise.all([
      db.from("clients").select("*", { count: "exact", head: true }).eq("status", "active"),
      db
        .from("clients")
        .select("*", { count: "exact", head: true })
        .gte("created_at", month.toISOString()),
      db
        .from("accesses")
        .select("*", { count: "exact", head: true })
        .gte("accessed_at", day.toISOString()),
      db
        .from("accesses")
        .select("*", { count: "exact", head: true })
        .gte("accessed_at", month.toISOString()),
      db
        .from("assessments")
        .select("*", { count: "exact", head: true })
        .gte("assessment_date", month.toISOString().slice(0, 10)),
      db
        .from("financial_entries")
        .select("amount")
        .eq("entry_type", "income")
        .eq("status", "paid")
        .gte("payment_date", month.toISOString().slice(0, 10)),
      db
        .from("financial_entries")
        .select("amount")
        .eq("entry_type", "expense")
        .eq("status", "paid")
        .gte("payment_date", month.toISOString().slice(0, 10)),
      db.from("products").select("id,name,current_stock,minimum_stock").eq("active", true),
    ]);
  const revenue = (income.data ?? []).reduce((s, x) => s + Number(x.amount), 0),
    expense = (expenses.data ?? []).reduce((s, x) => s + Number(x.amount), 0);
  return {
    activeClients: active.count ?? 0,
    newClients: newClients.count ?? 0,
    todayAccess: todayAccess.count ?? 0,
    monthAccess: monthAccess.count ?? 0,
    assessments: assessments.count ?? 0,
    revenue,
    expenses: expense,
    profit: revenue - expense,
    lowStock: (lowStock.data ?? []).filter(
      (p) => Number(p.current_stock) <= Number(p.minimum_stock),
    ),
  };
}
