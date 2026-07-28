import { getSupabase } from "@/integrations/supabase/client";
import type { Product, ProductCategory, ProductVerificationStatus } from "@/types/database";

export type ProductFilters = {
  search?: string;
  categoryId?: string;
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

export async function getProduct(id: string) {
  const { data, error } = await getSupabase()
    .from("products")
    .select("*, product_categories(id,name)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Product;
}

function validateProductPhoto(photo: File) {
  if (photo.type !== "image/jpeg" || photo.size > 2 * 1024 * 1024) {
    throw new Error("A foto processada é inválida ou excede 2 MB.");
  }
}

async function uploadProductPhoto(organizationId: string, productId: string, photo: File) {
  validateProductPhoto(photo);
  const path = `${organizationId}/${productId}/${crypto.randomUUID()}.jpg`;
  const { error } = await getSupabase()
    .storage.from("product-images")
    .upload(path, photo, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (error) throw error;
  return path;
}

export async function replaceProductPhotoBySku(sku: string, photo: File) {
  const supabase = getSupabase();
  const { data: product, error } = await supabase
    .from("products")
    .select("id,organization_id,photo_url")
    .ilike("sku", sku.trim())
    .single();
  if (error) throw new Error(`Produto com SKU ${sku} não encontrado.`);
  const path = await uploadProductPhoto(product.organization_id, product.id, photo);
  const { error: updateError } = await supabase
    .from("products")
    .update({ photo_url: path })
    .eq("id", product.id);
  if (updateError) {
    await supabase.storage.from("product-images").remove([path]);
    throw updateError;
  }
  if (product.photo_url && product.photo_url !== path) {
    await supabase.storage.from("product-images").remove([product.photo_url]);
  }
}

export async function createProduct(input: ProductInput, photo?: File | null) {
  const organizationId = await getOrganizationId();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("products")
    .insert({
      ...input,
      organization_id: organizationId,
      unit: input.consumption_unit,
      sku: input.sku?.trim() || null,
      name: input.name.trim(),
      brand: "Herbalife",
      pv_last_updated_at: input.volume_points === null ? null : new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  if (photo) {
    const photoPath = await uploadProductPhoto(organizationId, data.id, photo);
    const { data: updated, error: photoError } = await supabase
      .from("products")
      .update({ photo_url: photoPath })
      .eq("id", data.id)
      .select()
      .single();
    if (photoError) {
      await supabase.storage.from("product-images").remove([photoPath]);
      throw photoError;
    }
    return updated as Product;
  }
  return data as Product;
}

export async function updateProduct(
  id: string,
  input: ProductInput,
  options?: { photo?: File | null; removePhoto?: boolean; currentPhotoPath?: string | null },
) {
  const supabase = getSupabase();
  const { data: current, error: currentError } = await supabase
    .from("products")
    .select("organization_id, photo_url")
    .eq("id", id)
    .single();
  if (currentError) throw currentError;

  let newPhotoPath: string | null | undefined;
  if (options?.photo) {
    newPhotoPath = await uploadProductPhoto(current.organization_id, id, options.photo);
  } else if (options?.removePhoto) {
    newPhotoPath = null;
  }

  const { data, error } = await supabase
    .from("products")
    .update({
      ...input,
      unit: input.consumption_unit,
      sku: input.sku?.trim() || null,
      name: input.name.trim(),
      brand: "Herbalife",
      ...(newPhotoPath !== undefined ? { photo_url: newPhotoPath } : {}),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    if (newPhotoPath) await supabase.storage.from("product-images").remove([newPhotoPath]);
    throw error;
  }
  const oldPhotoPath = options?.currentPhotoPath ?? current.photo_url;
  if (oldPhotoPath && newPhotoPath !== undefined && oldPhotoPath !== newPhotoPath) {
    await supabase.storage.from("product-images").remove([oldPhotoPath]);
  }
  return data as Product;
}

export async function getProductPhotoUrl(path?: string | null) {
  if (!path) return null;
  const { data, error } = await getSupabase()
    .storage.from("product-images")
    .createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function getProductPhotoUrls(paths: Array<string | null>) {
  const uniquePaths = [...new Set(paths.filter((path): path is string => Boolean(path)))];
  if (!uniquePaths.length) return {} as Record<string, string>;
  const { data, error } = await getSupabase()
    .storage.from("product-images")
    .createSignedUrls(uniquePaths, 60 * 60);
  if (error) throw error;
  return Object.fromEntries(
    (data ?? [])
      .filter((item) => item.signedUrl)
      .map((item, index) => [uniquePaths[index], item.signedUrl]),
  ) as Record<string, string>;
}
