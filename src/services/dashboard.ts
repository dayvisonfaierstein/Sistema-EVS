import { getSupabase } from "@/integrations/supabase/client";

export async function getDashboardMetrics() {
  const db = getSupabase();
  const now = new Date(),
    month = new Date(now.getFullYear(), now.getMonth(), 1),
    day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [
    active,
    newClients,
    todayAccess,
    monthAccess,
    assessments,
    income,
    expenses,
    lowStock,
    consumptions,
    losses,
  ] = await Promise.all([
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
    db
      .from("products")
      .select("id,name,current_stock,minimum_stock,average_cost,volume_points,package_content")
      .eq("active", true),
    db
      .from("access_consumptions")
      .select("cost_total,pv_total")
      .gte("created_at", month.toISOString()),
    db
      .from("inventory_movements")
      .select("cost_total,pv_total")
      .not("loss_reason", "is", null)
      .gte("created_at", month.toISOString()),
  ]);
  const revenue = (income.data ?? []).reduce((s, x) => s + Number(x.amount), 0),
    expense = (expenses.data ?? []).reduce((s, x) => s + Number(x.amount), 0);
  const products = lowStock.data ?? [];
  const pvConsumed = (consumptions.data ?? []).reduce(
    (sum, item) => sum + Number(item.pv_total),
    0,
  );
  const consumptionCost = (consumptions.data ?? []).reduce(
    (sum, item) => sum + Number(item.cost_total),
    0,
  );
  const lossCost = (losses.data ?? []).reduce(
    (sum, movement) => sum + Number(movement.cost_total ?? 0),
    0,
  );
  const stockValue = products.reduce(
    (sum, product) => sum + Number(product.current_stock) * Number(product.average_cost),
    0,
  );
  const stockPv = products.reduce((sum, product) => {
    const content = Number(product.package_content);
    return content > 0
      ? sum + Number(product.current_stock) * (Number(product.volume_points) / content)
      : sum;
  }, 0);
  return {
    activeClients: active.count ?? 0,
    newClients: newClients.count ?? 0,
    todayAccess: todayAccess.count ?? 0,
    monthAccess: monthAccess.count ?? 0,
    assessments: assessments.count ?? 0,
    revenue,
    expenses: expense,
    profit: revenue - expense,
    stockValue,
    stockPv,
    pvConsumed,
    consumptionCost,
    lossCost,
    lowStock: products.filter((p) => Number(p.current_stock) <= Number(p.minimum_stock)),
  };
}
