import { getSupabase } from "@/integrations/supabase/client";

type ProductRow = {
  id: string;
  name: string;
  current_stock: number;
  minimum_stock: number;
  average_cost: number;
  volume_points: number | null;
  package_content: number | null;
  consumption_unit: string;
  active: boolean;
  product_categories: { name: string } | null;
};

type ConsumptionRow = {
  id: string;
  item_name_snapshot: string;
  consumption_type: "recipe" | "product";
  quantity: number;
  sale_price_snapshot: number;
  cost_total: number;
  pv_total: number;
  created_at: string;
};

type ConsumptionItemRow = {
  product_id: string | null;
  product_name_snapshot: string;
  quantity: number;
  cost_total: number;
  pv_total: number;
  created_at: string;
};

type MovementRow = {
  product_id: string;
  movement_type: string;
  quantity: number;
  loss_reason: string | null;
  cost_total: number | null;
  pv_total: number | null;
  created_at: string;
};

export type CommercialReport = {
  stock: {
    products: number;
    low: number;
    empty: number;
    value: number;
    pv: number;
  };
  period: {
    consumptions: number;
    servings: number;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
    pvConsumed: number;
    lossCost: number;
    lossPv: number;
  };
  monthly: Array<{ month: string; cost: number; pv: number; revenue: number }>;
  topPreparations: Array<{
    name: string;
    quantity: number;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
  }>;
  topProducts: Array<{ name: string; quantity: number; cost: number; pv: number }>;
  categories: Array<{ name: string; quantity: number; cost: number; pv: number }>;
  losses: Array<{
    reason: string;
    entries: number;
    quantity: number;
    cost: number;
    pv: number;
  }>;
};

const number = (value: unknown) => Number(value ?? 0);

function assertQuery(error: { message: string } | null, label: string) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

export async function getCommercialReport(from: string, to: string): Promise<CommercialReport> {
  const db = getSupabase();
  const start = `${from}T00:00:00.000Z`;
  const endDate = new Date(`${to}T00:00:00.000Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  const end = endDate.toISOString();
  const historyStart = new Date();
  historyStart.setUTCDate(1);
  historyStart.setUTCHours(0, 0, 0, 0);
  historyStart.setUTCMonth(historyStart.getUTCMonth() - 5);

  const [productsResult, consumptionResult, itemResult, movementResult, monthlyResult] =
    await Promise.all([
      db
        .from("products")
        .select(
          "id,name,current_stock,minimum_stock,average_cost,volume_points,package_content,consumption_unit,active,product_categories(name)",
        )
        .eq("active", true),
      db
        .from("access_consumptions")
        .select(
          "id,item_name_snapshot,consumption_type,quantity,sale_price_snapshot,cost_total,pv_total,created_at",
        )
        .gte("created_at", start)
        .lt("created_at", end)
        .order("created_at"),
      db
        .from("consumption_items")
        .select("product_id,product_name_snapshot,quantity,cost_total,pv_total,created_at")
        .gte("created_at", start)
        .lt("created_at", end),
      db
        .from("inventory_movements")
        .select("product_id,movement_type,quantity,loss_reason,cost_total,pv_total,created_at")
        .not("loss_reason", "is", null)
        .gte("created_at", start)
        .lt("created_at", end),
      db
        .from("access_consumptions")
        .select("cost_total,pv_total,sale_price_snapshot,quantity,created_at")
        .gte("created_at", historyStart.toISOString())
        .order("created_at"),
    ]);

  assertQuery(productsResult.error, "Não foi possível carregar os produtos");
  assertQuery(consumptionResult.error, "Não foi possível carregar os consumos");
  assertQuery(itemResult.error, "Não foi possível carregar os itens consumidos");
  assertQuery(movementResult.error, "Não foi possível carregar as perdas");
  assertQuery(monthlyResult.error, "Não foi possível carregar o histórico mensal");

  const products = (productsResult.data ?? []) as unknown as ProductRow[];
  const consumptions = (consumptionResult.data ?? []) as ConsumptionRow[];
  const items = (itemResult.data ?? []) as ConsumptionItemRow[];
  const movements = (movementResult.data ?? []) as MovementRow[];
  const productMap = new Map(products.map((product) => [product.id, product]));

  const stock = products.reduce(
    (summary, product) => {
      const current = number(product.current_stock);
      const minimum = number(product.minimum_stock);
      const packageContent = number(product.package_content);
      summary.products += 1;
      if (current <= 0) summary.empty += 1;
      else if (minimum > 0 && current <= minimum) summary.low += 1;
      summary.value += current * number(product.average_cost);
      if (packageContent > 0) {
        summary.pv += current * (number(product.volume_points) / packageContent);
      }
      return summary;
    },
    { products: 0, low: 0, empty: 0, value: 0, pv: 0 },
  );

  const period = consumptions.reduce(
    (summary, consumption) => {
      const quantity = number(consumption.quantity);
      const revenue = number(consumption.sale_price_snapshot);
      summary.consumptions += 1;
      summary.servings += quantity;
      summary.revenue += revenue;
      summary.cost += number(consumption.cost_total);
      summary.pvConsumed += number(consumption.pv_total);
      return summary;
    },
    {
      consumptions: 0,
      servings: 0,
      revenue: 0,
      cost: 0,
      profit: 0,
      margin: 0,
      pvConsumed: 0,
      lossCost: 0,
      lossPv: 0,
    },
  );
  period.profit = period.revenue - period.cost;
  period.margin = period.revenue > 0 ? (period.profit / period.revenue) * 100 : 0;

  const lossMap = new Map<string, CommercialReport["losses"][number]>();
  movements.forEach((movement) => {
    const reason = movement.loss_reason ?? "other";
    const current = lossMap.get(reason) ?? {
      reason,
      entries: 0,
      quantity: 0,
      cost: 0,
      pv: 0,
    };
    current.entries += 1;
    current.quantity += number(movement.quantity);
    current.cost += number(movement.cost_total);
    current.pv += number(movement.pv_total);
    period.lossCost += number(movement.cost_total);
    period.lossPv += number(movement.pv_total);
    lossMap.set(reason, current);
  });

  const preparationMap = new Map<string, CommercialReport["topPreparations"][number]>();
  consumptions.forEach((consumption) => {
    const name = consumption.item_name_snapshot;
    const current = preparationMap.get(name) ?? {
      name,
      quantity: 0,
      revenue: 0,
      cost: 0,
      profit: 0,
      margin: 0,
    };
    current.quantity += number(consumption.quantity);
    current.revenue += number(consumption.sale_price_snapshot);
    current.cost += number(consumption.cost_total);
    current.profit = current.revenue - current.cost;
    current.margin = current.revenue > 0 ? (current.profit / current.revenue) * 100 : 0;
    preparationMap.set(name, current);
  });

  const productConsumptionMap = new Map<string, CommercialReport["topProducts"][number]>();
  const categoryMap = new Map<string, CommercialReport["categories"][number]>();
  items.forEach((item) => {
    const name = item.product_name_snapshot;
    const productCurrent = productConsumptionMap.get(name) ?? {
      name,
      quantity: 0,
      cost: 0,
      pv: 0,
    };
    productCurrent.quantity += number(item.quantity);
    productCurrent.cost += number(item.cost_total);
    productCurrent.pv += number(item.pv_total);
    productConsumptionMap.set(name, productCurrent);

    const category = item.product_id
      ? productMap.get(item.product_id)?.product_categories?.name || "Sem categoria"
      : "Sem categoria";
    const categoryCurrent = categoryMap.get(category) ?? {
      name: category,
      quantity: 0,
      cost: 0,
      pv: 0,
    };
    categoryCurrent.quantity += number(item.quantity);
    categoryCurrent.cost += number(item.cost_total);
    categoryCurrent.pv += number(item.pv_total);
    categoryMap.set(category, categoryCurrent);
  });

  const monthlyMap = new Map<
    string,
    { month: string; cost: number; pv: number; revenue: number }
  >();
  const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "short" });
  for (let index = 0; index < 6; index += 1) {
    const date = new Date(historyStart);
    date.setUTCMonth(date.getUTCMonth() + index);
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(key, {
      month: monthFormatter.format(date).replace(".", ""),
      cost: 0,
      pv: 0,
      revenue: 0,
    });
  }
  (monthlyResult.data ?? []).forEach((row) => {
    const key = String(row.created_at).slice(0, 7);
    const month = monthlyMap.get(key);
    if (!month) return;
    month.cost += number(row.cost_total);
    month.pv += number(row.pv_total);
    month.revenue += number(row.sale_price_snapshot);
  });

  return {
    stock,
    period,
    monthly: [...monthlyMap.values()],
    topPreparations: [...preparationMap.values()]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8),
    topProducts: [...productConsumptionMap.values()]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8),
    categories: [...categoryMap.values()].sort((a, b) => b.cost - a.cost),
    losses: [...lossMap.values()].sort((a, b) => b.cost - a.cost),
  };
}
