import { getSupabase } from "@/integrations/supabase/client";
import type { Product, Recipe, RecipeItem } from "@/types/database";

export type RecipeItemWithProduct = RecipeItem & {
  products: Pick<
    Product,
    | "id"
    | "name"
    | "sku"
    | "photo_url"
    | "package_content"
    | "consumption_unit"
    | "volume_points"
    | "average_cost"
    | "cost_price"
    | "current_stock"
    | "active"
  > | null;
};

export type RecipeWithItems = Recipe & {
  recipe_items: RecipeItemWithProduct[];
};

export type RecipeInput = {
  name: string;
  category: string;
  description: string;
  salePrice: number;
  active: boolean;
  notes: string;
  items: Array<{ productId: string; quantity: number }>;
};

async function getOrganizationId() {
  const { data, error } = await getSupabase().from("profiles").select("organization_id").single();
  if (error) throw error;
  if (!data?.organization_id) throw new Error("Organização do usuário não encontrada.");
  return data.organization_id as string;
}

const recipeSelect =
  "*, recipe_items(*, products(id,name,sku,photo_url,package_content,consumption_unit,volume_points,average_cost,cost_price,current_stock,active))";

export async function listRecipes() {
  const { data, error } = await getSupabase()
    .from("recipes")
    .select(recipeSelect)
    .order("active", { ascending: false })
    .order("name");
  if (error) throw error;
  return (data ?? []) as RecipeWithItems[];
}

export async function getRecipe(id: string) {
  const { data, error } = await getSupabase()
    .from("recipes")
    .select(recipeSelect)
    .eq("id", id)
    .order("sort_order", { referencedTable: "recipe_items" })
    .single();
  if (error) throw error;
  return data as RecipeWithItems;
}

function validatePhoto(photo: File) {
  if (photo.type !== "image/jpeg" || photo.size > 2 * 1024 * 1024) {
    throw new Error("A foto processada é inválida ou excede 2 MB.");
  }
}

async function uploadRecipePhoto(organizationId: string, recipeId: string, photo: File) {
  validatePhoto(photo);
  const path = `${organizationId}/${recipeId}/${crypto.randomUUID()}.jpg`;
  const { error } = await getSupabase()
    .storage.from("recipe-images")
    .upload(path, photo, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (error) throw error;
  return path;
}

export async function saveRecipe(
  input: RecipeInput,
  options?: {
    id?: string;
    photo?: File | null;
    removePhoto?: boolean;
    currentPhotoPath?: string | null;
  },
) {
  const supabase = getSupabase();
  const { data: recipeId, error } = await supabase.rpc("save_recipe", {
    p_recipe_id: options?.id ?? null,
    p_name: input.name.trim(),
    p_category: input.category.trim() || null,
    p_description: input.description.trim() || null,
    p_sale_price: input.salePrice,
    p_active: input.active,
    p_notes: input.notes.trim() || null,
    p_items: input.items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
    })),
  });
  if (error) throw error;

  const id = recipeId as string;
  let newPhotoPath: string | null | undefined;
  if (options?.photo) {
    newPhotoPath = await uploadRecipePhoto(await getOrganizationId(), id, options.photo);
  } else if (options?.removePhoto) {
    newPhotoPath = null;
  }

  if (newPhotoPath !== undefined) {
    const { error: photoError } = await supabase
      .from("recipes")
      .update({ photo_url: newPhotoPath })
      .eq("id", id);
    if (photoError) {
      if (newPhotoPath) await supabase.storage.from("recipe-images").remove([newPhotoPath]);
      throw photoError;
    }
    const oldPath = options?.currentPhotoPath;
    if (oldPath && oldPath !== newPhotoPath) {
      await supabase.storage.from("recipe-images").remove([oldPath]);
    }
  }

  return getRecipe(id);
}

export async function getRecipePhotoUrls(paths: Array<string | null>) {
  const uniquePaths = [...new Set(paths.filter((path): path is string => Boolean(path)))];
  if (!uniquePaths.length) return {} as Record<string, string>;
  const { data, error } = await getSupabase()
    .storage.from("recipe-images")
    .createSignedUrls(uniquePaths, 60 * 60);
  if (error) throw error;
  return Object.fromEntries(
    (data ?? [])
      .filter((item) => item.signedUrl)
      .map((item, index) => [uniquePaths[index], item.signedUrl]),
  ) as Record<string, string>;
}

export function recipeTotals(recipe: Pick<RecipeWithItems, "sale_price" | "recipe_items">) {
  const cost = recipe.recipe_items.reduce((total, item) => {
    const product = item.products;
    if (!product) return total;
    const unitCost =
      product.average_cost > 0
        ? product.average_cost
        : product.package_content && product.package_content > 0
          ? product.cost_price / product.package_content
          : product.cost_price;
    return total + item.quantity * unitCost;
  }, 0);
  const pv = recipe.recipe_items.reduce((total, item) => {
    const product = item.products;
    if (!product?.volume_points || !product.package_content) return total;
    return total + item.quantity * (product.volume_points / product.package_content);
  }, 0);
  const profit = recipe.sale_price - cost;
  const margin = recipe.sale_price > 0 ? (profit / recipe.sale_price) * 100 : 0;
  return { cost, pv, profit, margin };
}

export function recipeAvailability(recipe: Pick<RecipeWithItems, "recipe_items">) {
  if (!recipe.recipe_items.length) return 0;
  return recipe.recipe_items.reduce((available, item) => {
    const product = item.products;
    if (!product?.active || item.quantity <= 0) return 0;
    return Math.min(available, Math.floor(product.current_stock / item.quantity));
  }, Number.POSITIVE_INFINITY);
}
