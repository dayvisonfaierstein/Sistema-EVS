import { getSupabase } from "@/integrations/supabase/client";

const sum = <T>(rows: T[], field: keyof T) =>
  rows.reduce((total, row) => total + Number(row[field] ?? 0), 0);

const variation = (current: number, previous: number) => {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

const dailySeries = <T extends { created_at?: string | null }>(
  rows: T[],
  value: (row: T) => number,
) => {
  const today = new Date();
  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - offset));
    const key = date.toISOString().slice(0, 10);
    return rows
      .filter((row) => row.created_at?.slice(0, 10) === key)
      .reduce((total, row) => total + value(row), 0);
  });
};

export async function getDashboardMetrics() {
  const db = getSupabase();
  const now = new Date();
  const month = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(day);
  sevenDaysAgo.setDate(day.getDate() - 6);

  const [
    active,
    newClients,
    todayAccess,
    monthAccess,
    assessments,
    income,
    expenses,
    productResult,
    consumptions,
    previousConsumptions,
    losses,
    previousLosses,
    recentConsumptions,
    recentLosses,
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
      .select("cost_total,pv_total,created_at")
      .gte("created_at", month.toISOString()),
    db
      .from("access_consumptions")
      .select("cost_total,pv_total")
      .gte("created_at", previousMonth.toISOString())
      .lt("created_at", month.toISOString()),
    db
      .from("inventory_movements")
      .select("cost_total,pv_total,created_at")
      .not("loss_reason", "is", null)
      .gte("created_at", month.toISOString()),
    db
      .from("inventory_movements")
      .select("cost_total,pv_total")
      .not("loss_reason", "is", null)
      .gte("created_at", previousMonth.toISOString())
      .lt("created_at", month.toISOString()),
    db
      .from("access_consumptions")
      .select("cost_total,pv_total,created_at")
      .gte("created_at", sevenDaysAgo.toISOString()),
    db
      .from("inventory_movements")
      .select("cost_total,pv_total,created_at")
      .not("loss_reason", "is", null)
      .gte("created_at", sevenDaysAgo.toISOString()),
  ]);

  const revenue = sum(income.data ?? [], "amount");
  const expense = sum(expenses.data ?? [], "amount");
  const products = productResult.data ?? [];
  const consumptionRows = consumptions.data ?? [];
  const previousConsumptionRows = previousConsumptions.data ?? [];
  const lossRows = losses.data ?? [];
  const previousLossRows = previousLosses.data ?? [];
  const pvConsumed = sum(consumptionRows, "pv_total");
  const consumptionCost = sum(consumptionRows, "cost_total");
  const lossCost = sum(lossRows, "cost_total");
  const previousPvConsumed = sum(previousConsumptionRows, "pv_total");
  const previousConsumptionCost = sum(previousConsumptionRows, "cost_total");
  const previousLossCost = sum(previousLossRows, "cost_total");
  const stockValue = products.reduce(
    (total, product) => total + Number(product.current_stock) * Number(product.average_cost),
    0,
  );
  const stockPv = products.reduce((total, product) => {
    const content = Number(product.package_content);
    return content > 0
      ? total + Number(product.current_stock) * (Number(product.volume_points) / content)
      : total;
  }, 0);
  const lowStock = products.filter(
    (product) =>
      Number(product.current_stock) > 0 &&
      Number(product.current_stock) <= Number(product.minimum_stock),
  );
  const outOfStock = products.filter((product) => Number(product.current_stock) <= 0);

  return {
    activeClients: active.count ?? 0,
    newClients: newClients.count ?? 0,
    todayAccess: todayAccess.count ?? 0,
    monthAccess: monthAccess.count ?? 0,
    assessments: assessments.count ?? 0,
    revenue,
    expenses: expense,
    profit: revenue - expense,
    productsCount: products.length,
    lowStockCount: lowStock.length,
    outOfStockCount: outOfStock.length,
    stockValue,
    stockPv,
    pvConsumed,
    consumptionCost,
    lossCost,
    lowStock,
    trends: {
      pvConsumed: variation(pvConsumed, previousPvConsumed),
      consumptionCost: variation(consumptionCost, previousConsumptionCost),
      lossCost: variation(lossCost, previousLossCost),
    },
    sparklines: {
      pvConsumed: dailySeries(recentConsumptions.data ?? [], (row) => Number(row.pv_total)),
      consumptionCost: dailySeries(recentConsumptions.data ?? [], (row) => Number(row.cost_total)),
      lossCost: dailySeries(recentLosses.data ?? [], (row) => Number(row.cost_total)),
    },
  };
}
