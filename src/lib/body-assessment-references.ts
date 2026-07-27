export type IndicatorState = "low" | "adequate" | "attention" | "high" | "very-high";

export type IndicatorReference = {
  state: IndicatorState;
  label: string;
  range?: string;
};

export const BMI_RANGES = [
  { min: 0, max: 18.5, label: "Baixo peso", state: "low" },
  { min: 18.5, max: 25, label: "Peso adequado", state: "adequate" },
  { min: 25, max: 30, label: "Sobrepeso", state: "attention" },
  { min: 30, max: 35, label: "Obesidade grau I", state: "high" },
  { min: 35, max: 40, label: "Obesidade grau II", state: "high" },
  { min: 40, max: Number.POSITIVE_INFINITY, label: "Obesidade grau III", state: "very-high" },
] as const;

export function calculateBMI(weight?: number | null, heightMeters?: number | null) {
  if (!weight || !heightMeters || weight <= 0 || heightMeters <= 0) return null;
  return Math.round((weight / heightMeters ** 2) * 100) / 100;
}

export function classifyBMI(bmi?: number | null): IndicatorReference | null {
  if (bmi == null || !Number.isFinite(bmi)) return null;
  const reference = BMI_RANGES.find((item) => bmi >= item.min && bmi < item.max);
  return reference ? { state: reference.state, label: reference.label } : null;
}

type ConfigurableReference = {
  enabled: boolean;
  source: string | null;
};

// Estas referências dependem do equipamento, sexo e idade. Permanecem
// desativadas até a unidade registrar as tabelas oficiais do aparelho usado.
export const bodyFatReference: ConfigurableReference = { enabled: false, source: null };
export const muscleReference: ConfigurableReference = { enabled: false, source: null };
export const visceralFatReference: ConfigurableReference = { enabled: false, source: null };

export function calculateAge(birthDate?: string | null, onDate = new Date()) {
  if (!birthDate) return null;
  const birth = new Date(`${birthDate}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  let age = onDate.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    onDate.getMonth() < birth.getMonth() ||
    (onDate.getMonth() === birth.getMonth() && onDate.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 && age <= 130 ? age : null;
}
