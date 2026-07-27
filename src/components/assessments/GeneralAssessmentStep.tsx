import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "./FormField";
import type { AssessmentFormData, FormUpdater } from "./assessment-form-types";

export function GeneralAssessmentStep({
  form,
  update,
  age,
}: {
  form: AssessmentFormData;
  update: FormUpdater;
  age: number | null;
}) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div>
        <Label className="mb-1.5 block">Data da avaliação</Label>
        <Input
          type="date"
          value={form.assessment_date}
          onChange={(event) => update("assessment_date", event.target.value)}
        />
      </div>
      <div>
        <Label className="mb-1.5 block">Idade na avaliação</Label>
        <Input value={age == null ? "Não informada" : `${age} anos`} disabled />
      </div>
      <FormField
        label="Peso atual"
        value={form.weight}
        onChange={(value) => update("weight", value)}
        suffix="kg"
        min={1}
        max={500}
        required
      />
      <FormField
        label="Altura"
        value={form.height}
        onChange={(value) => update("height", value)}
        suffix="cm"
        min={30}
        max={280}
        required
      />
      <div className="md:col-span-2">
        <Label className="mb-1.5 block">Observações iniciais</Label>
        <Textarea
          value={form.initial_notes}
          onChange={(event) => update("initial_notes", event.target.value)}
          placeholder="Contexto do atendimento, condições da medição ou observações relevantes."
        />
      </div>
    </div>
  );
}
