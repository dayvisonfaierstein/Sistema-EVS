import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, ClipboardList, Save, UserRound } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GeneralAssessmentStep } from "@/components/assessments/GeneralAssessmentStep";
import { MeasurementsAssessmentStep } from "@/components/assessments/MeasurementsAssessmentStep";
import { BioimpedanceAssessmentStep } from "@/components/assessments/BioimpedanceAssessmentStep";
import { GoalsAssessmentStep } from "@/components/assessments/GoalsAssessmentStep";
import { ReviewAssessmentStep } from "@/components/assessments/ReviewAssessmentStep";
import {
  numberOrNull,
  type AssessmentFormData,
  type FormUpdater,
} from "@/components/assessments/assessment-form-types";
import { calculateAge, calculateBMI, classifyBMI } from "@/lib/body-assessment-references";
import { listClients, getClient } from "@/services/clients";
import { createAssessment, listAssessments } from "@/services/assessments";

const searchSchema = z.object({ clientId: z.string().uuid().optional() });

export const Route = createFileRoute("/_app/avaliacoes/nova")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Nova avaliação corporal — Espaço+" }] }),
  component: NewAssessmentPage,
});

const steps = ["Dados gerais", "Medidas", "Bioimpedância", "Objetivos", "Revisão"];

const initialForm: AssessmentFormData = {
  assessment_date: new Date().toISOString().slice(0, 10),
  initial_notes: "",
  weight: "",
  height: "",
  waist: "",
  abdomen: "",
  chest: "",
  hip: "",
  right_arm: "",
  left_arm: "",
  right_thigh: "",
  left_thigh: "",
  body_fat_percentage: "",
  subcutaneous_fat_percentage: "",
  muscle_percentage: "",
  skeletal_muscle_percentage: "",
  muscle_mass: "",
  fat_mass: "",
  body_water_percentage: "",
  visceral_fat: "",
  bone_mass: "",
  protein_percentage: "",
  fat_free_mass: "",
  basal_metabolic_rate: "",
  metabolic_age: "",
  objectives: [],
  goal_weight: "",
  desired_weight_change: "",
  previous_attempts: "",
  previous_attempt_failure_reason: "",
  motivation: "",
  observations: "",
};

function NewAssessmentPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [clientId, setClientId] = useState(search.clientId ?? "");
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const clients = useQuery({
    queryKey: ["assessment-clients"],
    queryFn: () => listClients("", 0, 200),
  });
  const client = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => getClient(clientId),
    enabled: Boolean(clientId),
  });
  const history = useQuery({
    queryKey: ["assessments", clientId],
    queryFn: () => listAssessments(clientId),
    enabled: Boolean(clientId),
  });
  useEffect(() => {
    if (!client.data || form.height) return;
    const latestHeight = history.data?.[0]?.height;
    const height = client.data.height ?? latestHeight;
    if (height) setForm((value) => ({ ...value, height: String(Math.round(height * 1000) / 10) }));
  }, [client.data, form.height, history.data]);

  const assessmentDate = useMemo(
    () => new Date(`${form.assessment_date}T12:00:00`),
    [form.assessment_date],
  );
  const age = calculateAge(client.data?.birth_date, assessmentDate);
  const update: FormUpdater = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  function validateCurrentStep() {
    if (!clientId) return "Selecione o cliente.";
    if (step === 0) {
      const weight = Number(form.weight);
      const height = Number(form.height);
      if (!form.assessment_date) return "Informe a data da avaliação.";
      if (!Number.isFinite(weight) || weight <= 0 || weight > 500)
        return "Revise o peso informado.";
      if (!Number.isFinite(height) || height <= 0 || height > 280)
        return "Revise a altura informada.";
    }
    if (step === 2) {
      const percentages = [
        form.body_fat_percentage,
        form.subcutaneous_fat_percentage,
        form.muscle_percentage,
        form.skeletal_muscle_percentage,
        form.body_water_percentage,
        form.protein_percentage,
      ];
      if (percentages.some((value) => value && (Number(value) < 0 || Number(value) > 100))) {
        return "Percentuais devem estar entre 0 e 100.";
      }
    }
    return null;
  }

  function next() {
    const message = validateCurrentStep();
    if (message) return toast.error(message);
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  async function save() {
    const message = validateCurrentStep();
    if (message || !client.data) return toast.error(message ?? "Cliente não encontrado.");
    const height = Number(form.height) / 100;
    const bmi = calculateBMI(Number(form.weight), height);
    setSaving(true);
    try {
      const assessment = await createAssessment({
        client_id: clientId,
        assessment_date: form.assessment_date,
        age_at_assessment: age,
        weight: numberOrNull(form.weight),
        height,
        bmi_classification: classifyBMI(bmi)?.label ?? null,
        waist: numberOrNull(form.waist),
        abdomen: numberOrNull(form.abdomen),
        chest: numberOrNull(form.chest),
        hip: numberOrNull(form.hip),
        right_arm: numberOrNull(form.right_arm),
        left_arm: numberOrNull(form.left_arm),
        right_thigh: numberOrNull(form.right_thigh),
        left_thigh: numberOrNull(form.left_thigh),
        body_fat_percentage: numberOrNull(form.body_fat_percentage),
        subcutaneous_fat_percentage: numberOrNull(form.subcutaneous_fat_percentage),
        muscle_percentage: numberOrNull(form.muscle_percentage),
        skeletal_muscle_percentage: numberOrNull(form.skeletal_muscle_percentage),
        muscle_mass: numberOrNull(form.muscle_mass),
        fat_mass: numberOrNull(form.fat_mass),
        body_water_percentage: numberOrNull(form.body_water_percentage),
        visceral_fat: numberOrNull(form.visceral_fat),
        bone_mass: numberOrNull(form.bone_mass),
        protein_percentage: numberOrNull(form.protein_percentage),
        fat_free_mass: numberOrNull(form.fat_free_mass),
        basal_metabolic_rate: numberOrNull(form.basal_metabolic_rate),
        metabolic_age: numberOrNull(form.metabolic_age),
        objectives: form.objectives,
        goal_weight: numberOrNull(form.goal_weight),
        desired_weight_change: numberOrNull(form.desired_weight_change),
        previous_attempts: form.previous_attempts || null,
        previous_attempt_failure_reason: form.previous_attempt_failure_reason || null,
        motivation: form.motivation || null,
        initial_notes: form.initial_notes || null,
        observations: form.observations || null,
      });
      toast.success("Avaliação salva e adicionada ao histórico.");
      await navigate({ to: "/avaliacoes/$id", params: { id: assessment.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a avaliação.");
    } finally {
      setSaving(false);
    }
  }

  const currentContent = client.data
    ? [
        <GeneralAssessmentStep key="general" form={form} update={update} age={age} />,
        <MeasurementsAssessmentStep key="measurements" form={form} update={update} />,
        <BioimpedanceAssessmentStep key="bio" form={form} update={update} />,
        <GoalsAssessmentStep key="goals" form={form} update={update} />,
        <ReviewAssessmentStep key="review" form={form} clientName={client.data.full_name} />,
      ][step]
    : null;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Nova Avaliação Corporal</h1>
        <p className="text-sm text-muted-foreground">
          Preencha as etapas durante o atendimento. Campos avançados podem ficar em branco.
        </p>
      </div>
      {!clientId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="size-5" />
              Selecione o cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="max-w-lg">
                <SelectValue placeholder="Buscar na lista de clientes" />
              </SelectTrigger>
              <SelectContent>
                {clients.data?.clients.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}
      {client.data && (
        <>
          <Card>
            <CardContent className="flex flex-wrap items-center gap-4 p-4">
              <Avatar className="size-14">
                <AvatarFallback>{client.data.full_name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <strong>{client.data.full_name}</strong>
                <p className="text-sm text-muted-foreground">
                  {age == null ? "Idade não informada" : `${age} anos`} ·{" "}
                  {client.data.gender || "Sexo não informado"} ·{" "}
                  {client.data.phone || "Telefone não informado"}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setClientId("")}>
                Trocar cliente
              </Button>
            </CardContent>
          </Card>
          <ol className="grid grid-cols-5 gap-1" aria-label="Etapas da avaliação">
            {steps.map((label, index) => (
              <li key={label}>
                <button
                  type="button"
                  className={`w-full rounded-lg px-2 py-3 text-center text-xs font-medium ${
                    index === step
                      ? "bg-primary text-primary-foreground"
                      : index < step
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                  onClick={() => index < step && setStep(index)}
                >
                  <span className="mx-auto mb-1 grid size-6 place-items-center rounded-full border">
                    {index < step ? <Check className="size-3" /> : index + 1}
                  </span>
                  <span className="hidden sm:inline">{label}</span>
                </button>
              </li>
            ))}
          </ol>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="size-5 text-primary" />
                {steps[step]}
              </CardTitle>
            </CardHeader>
            <CardContent>{currentContent}</CardContent>
          </Card>
          <div className="flex justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => setStep((value) => value - 1)}
              disabled={step === 0}
            >
              <ArrowLeft />
              Voltar
            </Button>
            {step < steps.length - 1 ? (
              <Button onClick={next}>
                Próxima etapa
                <ArrowRight />
              </Button>
            ) : (
              <Button onClick={save} disabled={saving}>
                <Save />
                {saving ? "Salvando..." : "Salvar avaliação"}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
