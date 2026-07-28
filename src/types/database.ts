export type UserRole =
  | "super_admin"
  | "administrator"
  | "manager"
  | "attendant"
  | "evaluator"
  | "finance"
  | "inventory"
  | "client";

export type Profile = {
  id: string;
  organization_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  active: boolean;
  is_platform_admin: boolean;
  is_organization_admin: boolean;
  first_access: boolean;
  job_title: string | null;
  access_template: string | null;
  last_access_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OrganizationStatus =
  | "pending"
  | "trial"
  | "active"
  | "grace_period"
  | "blocked"
  | "cancelled"
  | "inactive";

export type Organization = {
  id: string;
  legal_name: string;
  trade_name: string;
  document: string | null;
  legal_document_type: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  address_number: string | null;
  address_complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  responsible_name: string | null;
  responsible_phone: string | null;
  responsible_whatsapp: string | null;
  responsible_email: string | null;
  status: OrganizationStatus;
  onboarding_completed: boolean;
  onboarding_completed_at: string | null;
  subscription_status: string;
  active: boolean;
  blocked_at: string | null;
  blocked_reason: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Permission = {
  id: string;
  key: string;
  module: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type AccessTemplateKey =
  | "administrator"
  | "commercial"
  | "service"
  | "assessment"
  | "inventory"
  | "finance"
  | "custom";

export type AccessTemplate = {
  id: string;
  key: AccessTemplateKey;
  name: string;
  description: string | null;
  is_system: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type UserPermission = {
  id: string;
  organization_id: string;
  user_id: string;
  permission_id: string;
  granted: boolean;
  granted_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Client = {
  id: string;
  organization_id: string;
  full_name: string;
  cpf: string | null;
  birth_date: string | null;
  gender: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  profession: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  photo_url: string | null;
  height: number | null;
  primary_goal: string | null;
  status: "active" | "inactive" | "new";
  registration_date: string;
  last_visit_at: string | null;
  notes: string | null;
  created_at: string;
};

export type Assessment = {
  id: string;
  organization_id: string;
  client_id: string;
  assessment_date: string;
  evaluator_id: string | null;
  evaluator_name: string | null;
  age_at_assessment: number | null;
  weight: number | null;
  height: number | null;
  bmi: number | null;
  bmi_classification: string | null;
  body_fat_percentage: number | null;
  subcutaneous_fat_percentage: number | null;
  muscle_mass: number | null;
  muscle_percentage: number | null;
  skeletal_muscle_percentage: number | null;
  fat_mass: number | null;
  lean_mass: number | null;
  fat_free_mass: number | null;
  body_water_percentage: number | null;
  visceral_fat: number | null;
  bone_mass: number | null;
  protein_percentage: number | null;
  basal_metabolic_rate: number | null;
  metabolic_age: number | null;
  waist: number | null;
  abdomen: number | null;
  chest: number | null;
  hip: number | null;
  right_arm: number | null;
  left_arm: number | null;
  right_thigh: number | null;
  left_thigh: number | null;
  objectives: string[];
  goal_weight: number | null;
  desired_weight_change: number | null;
  previous_attempts: string | null;
  previous_attempt_failure_reason: string | null;
  motivation: string | null;
  initial_notes: string | null;
  observations: string | null;
  created_at: string;
};

export type ExperiencePlan = {
  id: string;
  organization_id: string;
  client_id: string;
  started_at: string;
  status: "active" | "completed" | "cancelled";
  notes: string | null;
  created_at: string;
  experience_plan_days?: ExperiencePlanDay[];
};

export type ExperiencePlanDay = {
  id: string;
  plan_id: string;
  day_number: number;
  plan_date: string;
  breakfast: string | null;
  lunch: string | null;
  dinner: string | null;
  notes: string | null;
  completed: boolean;
};

export type ClientReferral = {
  id: string;
  organization_id: string;
  referring_client_id: string;
  name: string;
  phone: string | null;
  city: string | null;
  relationship: string | null;
  status: string;
  notes: string | null;
  created_at: string;
};

export type Access = {
  id: string;
  organization_id: string;
  client_id: string;
  accessed_at: string;
  access_type: string;
  service_performed: string | null;
  notes: string | null;
  created_at: string;
  clients?: Pick<Client, "full_name" | "photo_url">;
  access_consumptions?: Array<
    Pick<
      AccessConsumption,
      "id" | "item_name_snapshot" | "quantity" | "cost_total" | "pv_total" | "consumption_type"
    >
  >;
};

export type ProductCategory = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductVerificationStatus = "pending" | "verified" | "updated";

export type Product = {
  id: string;
  organization_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  brand: string | null;
  subcategory: string | null;
  sku: string | null;
  barcode: string | null;
  unit: string;
  photo_url: string | null;
  package_content: number | null;
  content_unit: string | null;
  stock_unit: string;
  consumption_unit: string;
  volume_points: number | null;
  pv_last_updated_at: string | null;
  cost_price: number;
  average_cost: number;
  sale_price: number;
  minimum_stock: number;
  current_stock: number;
  track_batches: boolean;
  active: boolean;
  notes: string | null;
  verification_status: ProductVerificationStatus;
  source_name: string | null;
  source_url: string | null;
  source_reference_date: string | null;
  created_at: string;
  updated_at: string;
  product_categories?: Pick<ProductCategory, "id" | "name"> | null;
};

export type ProductReferencePrice = {
  id: string;
  organization_id: string;
  product_id: string;
  state_code: string;
  reference_date: string;
  gross_price: number | null;
  earnings_base: number | null;
  price_25: number | null;
  price_35: number | null;
  price_42: number | null;
  price_50: number | null;
  source_name: string | null;
  source_url: string | null;
  imported_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductPvHistory = {
  id: string;
  organization_id: string;
  product_id: string;
  volume_points: number;
  effective_from: string;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
};

export type ProductBatch = {
  id: string;
  organization_id: string;
  product_id: string;
  supplier_id: string | null;
  batch_number: string;
  manufacture_date: string | null;
  expiration_date: string | null;
  package_quantity: number | null;
  package_unit: string | null;
  consumption_unit: string | null;
  initial_quantity: number;
  current_quantity: number;
  unit_cost: number;
  received_at: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type InventoryMovement = {
  id: string;
  organization_id: string;
  product_id: string;
  batch_id: string | null;
  access_id: string | null;
  movement_type: string;
  quantity: number;
  unit: string | null;
  previous_balance: number;
  new_balance: number;
  reason: string | null;
  loss_reason:
    | "expiration"
    | "spill"
    | "preparation_error"
    | "damaged_package"
    | "stock_adjustment"
    | "other"
    | null;
  unit_cost_snapshot: number | null;
  cost_total: number | null;
  pv_total: number | null;
  notes: string | null;
  reference_type: string | null;
  reference_id: string | null;
  user_id: string | null;
  created_at: string;
};

export type Recipe = {
  id: string;
  organization_id: string;
  name: string;
  category: string | null;
  description: string | null;
  photo_url: string | null;
  sale_price: number;
  active: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type RecipeItem = {
  id: string;
  organization_id: string;
  recipe_id: string;
  product_id: string;
  quantity: number;
  unit: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type AccessConsumption = {
  id: string;
  organization_id: string;
  access_id: string;
  client_id: string;
  consumption_type: "recipe" | "product";
  recipe_id: string | null;
  direct_product_id: string | null;
  item_name_snapshot: string;
  quantity: number;
  sale_price_snapshot: number;
  cost_total: number;
  pv_total: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type ConsumptionItem = {
  id: string;
  organization_id: string;
  access_consumption_id: string;
  product_id: string | null;
  batch_id: string | null;
  inventory_movement_id: string | null;
  product_name_snapshot: string;
  sku_snapshot: string | null;
  quantity: number;
  unit: string;
  unit_cost_snapshot: number;
  cost_total: number;
  unit_pv_snapshot: number;
  pv_total: number;
  created_at: string;
};
