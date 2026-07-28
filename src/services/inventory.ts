import { getSupabase } from "@/integrations/supabase/client";
import type { InventoryMovement, Product } from "@/types/database";

export type InventoryMovementType =
  | "purchase"
  | "positive_adjustment"
  | "return"
  | "consumption"
  | "sale"
  | "loss"
  | "expiration"
  | "negative_adjustment";

export type InventoryMovementInput = {
  productId: string;
  movementType: InventoryMovementType;
  quantity: number;
  quantityMode: "package" | "consumption";
  reason: string;
  notes?: string;
  unitCost?: number | null;
  batchNumber?: string;
  manufactureDate?: string;
  expirationDate?: string;
};

export type InventoryMovementWithRelations = InventoryMovement & {
  products: Pick<Product, "id" | "name" | "sku" | "consumption_unit"> | null;
  profiles: { full_name: string } | null;
};

export async function listInventoryMovements(limit = 100) {
  const { data, error } = await getSupabase()
    .from("inventory_movements")
    .select(
      "*, products(id,name,sku,consumption_unit), profiles!inventory_movements_user_id_fkey(full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as InventoryMovementWithRelations[];
}

export async function listExpiringBatches(days = 60) {
  const end = new Date();
  end.setDate(end.getDate() + days);
  const { data, error } = await getSupabase()
    .from("product_batches")
    .select("id, expiration_date, current_quantity, products(id,name,consumption_unit)")
    .eq("status", "active")
    .gt("current_quantity", 0)
    .not("expiration_date", "is", null)
    .lte("expiration_date", end.toISOString().slice(0, 10))
    .order("expiration_date");
  if (error) throw error;
  return data ?? [];
}

export async function registerInventoryMovement(input: InventoryMovementInput) {
  const { data, error } = await getSupabase().rpc("register_inventory_movement", {
    p_product_id: input.productId,
    p_movement_type: input.movementType,
    p_quantity: input.quantity,
    p_quantity_mode: input.quantityMode,
    p_reason: input.reason.trim(),
    p_notes: input.notes?.trim() || null,
    p_unit_cost: input.unitCost ?? null,
    p_batch_number: input.batchNumber?.trim() || null,
    p_manufacture_date: input.manufactureDate || null,
    p_expiration_date: input.expirationDate || null,
  });
  if (error) throw error;
  return data as {
    movement_id: string;
    product_id: string;
    previous_balance: number;
    new_balance: number;
    quantity: number;
    unit: string;
    average_cost: number;
    batch_id: string | null;
  };
}
