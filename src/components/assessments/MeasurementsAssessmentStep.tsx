import { BodySilhouette } from "./BodySilhouette";
import { FormField } from "./FormField";
import type { AssessmentFormData, FormUpdater } from "./assessment-form-types";

export function MeasurementsAssessmentStep({
  form,
  update,
}: {
  form: AssessmentFormData;
  update: FormUpdater;
}) {
  const fields: [keyof AssessmentFormData, string][] = [
    ["waist", "Cintura"],
    ["abdomen", "Barriga / Abdômen"],
    ["chest", "Tórax / Busto"],
    ["hip", "Quadril"],
    ["right_arm", "Braço direito"],
    ["left_arm", "Braço esquerdo"],
    ["right_thigh", "Coxa direita"],
    ["left_thigh", "Coxa esquerda"],
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(([key, label]) => (
          <FormField
            key={key}
            label={label}
            value={form[key] as string}
            onChange={(value) => update(key, value)}
            suffix="cm"
            min={1}
            max={300}
          />
        ))}
      </div>
      <BodySilhouette />
    </div>
  );
}
