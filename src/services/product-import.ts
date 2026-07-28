import { getSupabase } from "@/integrations/supabase/client";
import type { HerbalifePePriceRow } from "@/data/herbalife-pe-price-list";

export type ImportAction = "create" | "update" | "skip";
export type ImportCostBasis = "gross_price" | "price_25" | "price_35" | "price_42" | "price_50";

export type HerbalifeImportPreviewRow = HerbalifePePriceRow & {
  existingProductId: string | null;
  existingName: string | null;
  status: "new" | "existing" | "conflict";
  action: ImportAction;
};

export async function analyzeHerbalifePeImport(rows: HerbalifePePriceRow[]) {
  const skus = rows.map((row) => row.sku);
  const { data, error } = await getSupabase()
    .from("products")
    .select("id, sku, name")
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
    };
  });
}

export async function importHerbalifePeProducts(
  rows: HerbalifeImportPreviewRow[],
  costBasis: ImportCostBasis,
) {
  const payload = rows.map(({ existingProductId, existingName, status, ...row }) => row);
  const { data, error } = await getSupabase().rpc("import_herbalife_pe_products", {
    p_rows: payload,
    p_cost_basis: costBasis,
  });
  if (error) throw error;
  return data as { created: number; updated: number; skipped: number };
}
