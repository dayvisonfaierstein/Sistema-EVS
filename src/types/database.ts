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
  weight: number | null;
  height: number | null;
  bmi: number | null;
  body_fat_percentage: number | null;
  muscle_mass: number | null;
  waist: number | null;
  abdomen: number | null;
  hip: number | null;
  observations: string | null;
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
