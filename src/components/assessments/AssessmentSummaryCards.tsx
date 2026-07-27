import type { Assessment } from "@/types/database";
import { classifyBMI } from "@/lib/body-assessment-references";
import { cn } from "@/lib/utils";

const stateStyles = {
  low: "border-sky-200 bg-sky-50",
  adequate: "border-emerald-200 bg-emerald-50",
  attention: "border-amber-200 bg-amber-50",
  high: "border-orange-200 bg-orange-50",
  "very-high": "border-rose-200 bg-rose-50",
};

export function AssessmentSummaryCards({ assessment }: { assessment: Assessment }) {
  const bmiReference = classifyBMI(assessment.bmi);
  const cards = [
    ["Peso", assessment.weight, "kg", null],
    ["IMC", assessment.bmi, "", bmiReference],
    ["Gordura corporal", assessment.body_fat_percentage, "%", null],
    ["Massa muscular", assessment.muscle_mass, "kg", null],
    ["Taxa muscular", assessment.muscle_percentage, "%", null],
    ["Músculo esquelético", assessment.skeletal_muscle_percentage, "%", null],
    ["Gordura visceral", assessment.visceral_fat, "", null],
    ["Metabolismo basal", assessment.basal_metabolic_rate, "kcal", null],
    ["Idade metabólica", assessment.metabolic_age, "anos", null],
  ] as const;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, value, suffix, reference]) => (
        <div
          key={label}
          className={cn("rounded-xl border bg-card p-4", reference && stateStyles[reference.state])}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold">
            {value ?? "—"} {value != null && suffix}
          </p>
          {reference && <p className="mt-1 text-xs font-medium">{reference.label}</p>}
        </div>
      ))}
    </div>
  );
}
