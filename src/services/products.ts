import { getSupabase } from "@/integrations/supabase/client";
import type { Product, ProductCategory, ProductVerificationStatus } from "@/types/database";

export type ProductFilters = {
  search?: string;
  categoryId?: string;
  brand?: string;
  active?: "all" | "active" | "inactive";
  stock?: "all" | "in_stock" | "low" | "out";
};

export type ProductInput = {
  category_id: string | null;
  name: string;
  description: string | null;
  brand: string | null;
  subcategory: string | null;
  sku: string | null;
  barcode: string | null;
  package_content: number | null;
  content_unit: string | null;
  stock_unit: string;
  consumption_unit: string;
  volume_points: number | null;
  cost_price: number;
  sale_price: number;
  minimum_stock: number;
  track_batches: boolean;
  active: boolean;
  notes: string | null;
  verification_status: ProductVerificationStatus;
};

async function getOrganizationId() {
  const { data, error } = await getSupabase().from("profiles").select("organization_id").single();
  if (error) throw error;
  if (!data?.organization_id) throw new Error("Organização do usuário não encontrada.");
  return data.organization_id as string;
}

export async function listProductCategories(includeInactive = false) {
  let query = getSupabase().from("product_categories").select("*").order("name");
  if (!includeInactive) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ProductCategory[];
}

export async function createProductCategory(input: { name: string; description?: string }) {
  const organizationId = await getOrganizationId();
  const { data, error } = await getSupabase()
    .from("product_categories")
    .insert({
      organization_id: organizationId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ProductCategory;
}

export async function setProductCategoryActive(id: string, active: boolean) {
  const { data, error } = await getSupabase()
    .from("product_categories")
    .update({ active })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as ProductCategory;
}

export async function listProducts(filters: ProductFilters = {}) {
  let query = getSupabase()
    .from("products")
    .select("*, product_categories(id,name)")
    .order("name")
    .limit(500);

  const search = filters.search?.trim();
  if (search) query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.brand) query = query.eq("brand", filters.brand);
  if (filters.active === "active") query = query.eq("active", true);
  if (filters.active === "inactive") query = query.eq("active", false);

  const { data, error } = await query;
  if (error) throw error;

  let products = (data ?? []) as Product[];
  if (filters.stock === "out") {
    products = products.filter((product) => product.active && product.current_stock <= 0);
  } else if (filters.stock === "low") {
    products = products.filter(
      (product) =>
        product.active &&
        product.current_stock > 0 &&
        product.current_stock <= product.minimum_stock,
    );
  } else if (filters.stock === "in_stock") {
    products = products.filter(
      (product) => product.active && product.current_stock > product.minimum_stock,
    );
  }

  return products;
}

export async function listProductBrands() {
  const { data, error } = await getSupabase()
    .from("products")
    .select("brand")
    .not("brand", "is", null)
    .order("brand");
  if (error) throw error;
  return [...new Set((data ?? []).map((item) => item.brand).filter(Boolean))] as string[];
}

export async function getProduct(id: string) {
  const { data, error } = await getSupabase()
    .from("products")
    .select("*, product_categories(id,name)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Product;
}

export async function createProduct(input: ProductInput) {
  const organizationId = await getOrganizationId();
  const { data, error } = await getSupabase()
    .from("products")
    .insert({
      ...input,
      organization_id: organizationId,
      unit: input.consumption_unit,
      sku: input.sku?.trim() || null,
      name: input.name.trim(),
      brand: input.brand?.trim() || null,
      pv_last_updated_at: input.volume_points === null ? null : new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data as Product;
}

export async function updateProduct(id: string, input: ProductInput) {
  const { data, error } = await getSupabase()
    .from("products")
    .update({
      ...input,
      unit: input.consumption_unit,
      sku: input.sku?.trim() || null,
      name: input.name.trim(),
      brand: input.brand?.trim() || null,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Product;
}
