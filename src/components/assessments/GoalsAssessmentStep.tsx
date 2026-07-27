import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "./FormField";
import type { AssessmentFormData, FormUpdater } from "./assessment-form-types";

const objectives = [
  "Perder peso",
  "Ganhar peso",
  "Manter peso",
  "Melhorar composição corporal",
  "Ganhar massa muscular",
  "Reduzir gordura corporal",
  "Saúde / qualidade de vida",
];

export function GoalsAssessmentStep({
  form,
  update,
}: {
  form: AssessmentFormData;
  update: FormUpdater;
}) {
  function toggle(objective: string, checked: boolean) {
    update(
      "objectives",
      checked
        ? [...form.objectives, objective]
        : form.objectives.filter((item) => item !== objective),
    );
  }
  return (
    <div className="space-y-6">
      <div>
        <Label className="mb-3 block">Objetivos</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          {objectives.map((objective) => (
            <label
              key={objective}
              className="flex items-center gap-3 rounded-xl border p-3 text-sm"
            >
              <Checkbox
                checked={form.objectives.includes(objective)}
                onCheckedChange={(checked) => toggle(objective, checked === true)}
              />
              {objective}
            </label>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Meta de peso"
          value={form.goal_weight}
          onChange={(value) => update("goal_weight", value)}
          suffix="kg"
          min={1}
        />
        <FormField
          label="Quanto deseja perder ou ganhar?"
          value={form.desired_weight_change}
          onChange={(value) => update("desired_weight_change", value)}
          suffix="kg"
        />
      </div>
      {[
        ["previous_attempts", "O que já tentou anteriormente?"],
        ["previous_attempt_failure_reason", "Por que não funcionou?"],
        ["motivation", "Por que esse objetivo é importante?"],
        ["observations", "Observações"],
      ].map(([key, label]) => (
        <div key={key}>
          <Label className="mb-1.5 block">{label}</Label>
          <Textarea
            value={form[key as keyof AssessmentFormData] as string}
            onChange={(event) =>
              update(key as keyof AssessmentFormData, event.target.value as never)
            }
          />
        </div>
      ))}
    </div>
  );
}
