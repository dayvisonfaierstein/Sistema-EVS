export type UserRole =
  | "super_admin"
  | "administrator"
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
};
