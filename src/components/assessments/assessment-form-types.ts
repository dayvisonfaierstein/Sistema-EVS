export type AssessmentFormData = {
  assessment_date: string;
  initial_notes: string;
  weight: string;
  height: string;
  waist: string;
  abdomen: string;
  chest: string;
  hip: string;
  right_arm: string;
  left_arm: string;
  right_thigh: string;
  left_thigh: string;
  body_fat_percentage: string;
  subcutaneous_fat_percentage: string;
  muscle_percentage: string;
  muscle_mass: string;
  fat_mass: string;
  body_water_percentage: string;
  visceral_fat: string;
  bone_mass: string;
  protein_percentage: string;
  fat_free_mass: string;
  basal_metabolic_rate: string;
  metabolic_age: string;
  objectives: string[];
  goal_weight: string;
  desired_weight_change: string;
  previous_attempts: string;
  previous_attempt_failure_reason: string;
  motivation: string;
  observations: string;
};

export type FormUpdater = <K extends keyof AssessmentFormData>(
  key: K,
  value: AssessmentFormData[K],
) => void;

export function numberOrNull(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
