import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { calculateBMI, classifyBMI } from "@/lib/body-assessment-references";
import type { AssessmentFormData } from "./assessment-form-types";

export function ReviewAssessmentStep({
  form,
  clientName,
}: {
  form: AssessmentFormData;
  clientName: string;
}) {
  const bmi = calculateBMI(Number(form.weight), Number(form.height) / 100);
  const classification = classifyBMI(bmi);
  const sections = [
    {
      title: "Dados gerais",
      values: [
        ["Cliente", clientName],
        ["Data", new Date(`${form.assessment_date}T12:00:00`).toLocaleDateString("pt-BR")],
        ["Peso", `${form.weight || "—"} kg`],
        ["Altura", `${form.height || "—"} cm`],
        ["IMC", bmi == null ? "—" : `${bmi} · ${classification?.label ?? ""}`],
      ],
    },
    {
      title: "Composição corporal",
      values: [
        ["Gordura", form.body_fat_percentage ? `${form.body_fat_percentage}%` : "—"],
        [
          "Gordura subcutânea",
          form.subcutaneous_fat_percentage ? `${form.subcutaneous_fat_percentage}%` : "—",
        ],
        ["Massa muscular", form.muscle_mass ? `${form.muscle_mass} kg` : "—"],
        ["Taxa muscular", form.muscle_percentage ? `${form.muscle_percentage}%` : "—"],
        [
          "Massa muscular esquelética",
          form.skeletal_muscle_percentage ? `${form.skeletal_muscle_percentage}%` : "—",
        ],
        ["Gordura visceral", form.visceral_fat || "—"],
        [
          "Metabolismo basal",
          form.basal_metabolic_rate ? `${form.basal_metabolic_rate} kcal` : "—",
        ],
        ["Idade metabólica", form.metabolic_age ? `${form.metabolic_age} anos` : "—"],
      ],
    },
    {
      title: "Objetivos",
      values: [
        ["Selecionados", form.objectives.join(", ") || "Não informados"],
        ["Meta de peso", form.goal_weight ? `${form.goal_weight} kg` : "—"],
        ["Motivação", form.motivation || "—"],
      ],
    },
  ];
  return (
    <div className="space-y-5">
      <Alert>
        <AlertTriangle className="size-4" />
        <AlertDescription>
          Confira os dados com atenção. Depois de salva, esta avaliação será preservada como
          registro histórico independente.
        </AlertDescription>
      </Alert>
      <div className="grid gap-4 lg:grid-cols-3">
        {sections.map((section) => (
          <div key={section.title} className="rounded-xl border p-4">
            <h3 className="font-semibold">{section.title}</h3>
            <dl className="mt-3 space-y-2 text-sm">
              {section.values.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 border-b pb-2 last:border-0">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
