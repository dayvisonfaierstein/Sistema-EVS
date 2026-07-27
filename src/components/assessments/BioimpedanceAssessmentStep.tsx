import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormField } from "./FormField";
import type { AssessmentFormData, FormUpdater } from "./assessment-form-types";

export function BioimpedanceAssessmentStep({
  form,
  update,
}: {
  form: AssessmentFormData;
  update: FormUpdater;
}) {
  const fields: [keyof AssessmentFormData, string, string, number | undefined][] = [
    ["body_fat_percentage", "Gordura corporal", "%", 100],
    ["visceral_fat", "Gordura visceral", "nível", undefined],
    ["subcutaneous_fat_percentage", "Gordura subcutânea", "%", 100],
    ["body_water_percentage", "Água corporal", "%", 100],
    ["muscle_mass", "Massa muscular", "kg", undefined],
    ["bone_mass", "Massa óssea", "kg", undefined],
    ["protein_percentage", "Proteína", "%", 100],
    ["basal_metabolic_rate", "Metabolismo basal", "kcal", undefined],
    ["metabolic_age", "Idade corporal", "anos", 130],
    ["muscle_percentage", "Massa muscular (opcional)", "%", 100],
    ["fat_mass", "Massa de gordura", "kg", undefined],
    ["fat_free_mass", "Massa livre de gordura", "kg", undefined],
  ];
  return (
    <div className="space-y-5">
      <Alert>
        <AlertCircle className="size-4" />
        <AlertDescription>
          Transcreva os valores exibidos pelo equipamento. As faixas de gordura e músculo serão
          ativadas quando o modelo utilizado pela unidade estiver configurado.
        </AlertDescription>
      </Alert>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {fields.map(([key, label, suffix, max]) => (
          <FormField
            key={key}
            label={label}
            value={form[key] as string}
            onChange={(value) => update(key, value)}
            suffix={suffix}
            min={0}
            max={max}
          />
        ))}
      </div>
    </div>
  );
}
