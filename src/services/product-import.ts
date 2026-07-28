import { getSupabase } from "@/integrations/supabase/client";
import type { HerbalifePePriceRow } from "@/data/herbalife-pe-price-list";

export type ImportAction = "create" | "update" | "skip";
export type ImportCostBasis = "gross_price" | "price_25" | "price_35" | "price_42" | "price_50";

export type HerbalifeImportPreviewRow = HerbalifePePriceRow & {
  existingProductId: string | null;
  existingName: string | null;
  status: "new" | "existing" | "conflict";
  action: ImportAction;
  previousReferenceDate: string | null;
  previousPv: number | null;
  previousGrossPrice: number | null;
};

export async function analyzeHerbalifePeImport(rows: HerbalifePePriceRow[]) {
  const skus = rows.map((row) => row.sku);
  const { data, error } = await getSupabase()
    .from("products")
    .select(
      "id,sku,name,volume_points,sale_price,product_reference_prices(reference_date,gross_price)",
    )
    .in("sku", skus);
  if (error) throw error;

  const existingBySku = new Map(
    (data ?? []).map((product) => [String(product.sku).toUpperCase(), product]),
  );
  return rows.map((row): HerbalifeImportPreviewRow => {
    const existing = existingBySku.get(row.sku.toUpperCase());
    if (!existing) {
      return {
        ...row,
        existingProductId: null,
        existingName: null,
        status: "new",
        action: "create",
        previousReferenceDate: null,
        previousPv: null,
        previousGrossPrice: null,
      };
    }
    const sameName =
      existing.name.trim().toLocaleLowerCase("pt-BR") ===
      row.name.trim().toLocaleLowerCase("pt-BR");
    return {
      ...row,
      existingProductId: existing.id,
      existingName: existing.name,
      status: sameName ? "existing" : "conflict",
      action: "skip",
      previousReferenceDate:
        [...(existing.product_reference_prices ?? [])].sort((a, b) =>
          String(b.reference_date).localeCompare(String(a.reference_date)),
        )[0]?.reference_date ?? null,
      previousPv: existing.volume_points === null ? null : Number(existing.volume_points),
      previousGrossPrice: existing.sale_price === null ? null : Number(existing.sale_price),
    };
  });
}

export async function importHerbalifePeProducts(
  rows: HerbalifeImportPreviewRow[],
  costBasis: ImportCostBasis,
) {
  const payload = rows.map(
    ({
      existingProductId,
      existingName,
      status,
      previousReferenceDate,
      previousPv,
      previousGrossPrice,
      ...row
    }) => row,
  );
  const { data, error } = await getSupabase().rpc("import_herbalife_pe_products", {
    p_rows: payload,
    p_cost_basis: costBasis,
  });
  if (error) throw error;
  return data as { created: number; updated: number; skipped: number };
}

export async function getDefaultImportCostBasis() {
  const { data, error } = await getSupabase().rpc("get_product_cost_basis");
  if (error) throw error;
  return (data ?? "price_50") as ImportCostBasis;
}

export async function saveDefaultImportCostBasis(costBasis: ImportCostBasis) {
  const { error } = await getSupabase().rpc("set_product_cost_basis", {
    p_cost_basis: costBasis,
  });
  if (error) throw error;
}
