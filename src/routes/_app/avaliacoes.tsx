import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Save } from "lucide-react";
import { PageHeader } from "@/components/layout/PageChrome";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { listClients } from "@/services/clients";
import { createAssessment, listAssessments } from "@/services/operations";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/avaliacoes")({
  head: () => ({ meta: [{ title: "Avaliações — Espaço+" }] }),
  component: Assessments,
});
function Assessments() {
  const qc = useQueryClient();
  const clients = useQuery({
    queryKey: ["assessment-clients"],
    queryFn: () => listClients("", 0, 100),
  });
  const history = useQuery({ queryKey: ["assessments"], queryFn: () => listAssessments() });
  const [clientId, setClientId] = useState("");
  const [form, setForm] = useState({
    weight: "",
    height: "",
    body_fat_percentage: "",
    muscle_mass: "",
    waist: "",
    abdomen: "",
    hip: "",
    observations: "",
  });
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!clientId) return toast.error("Selecione um cliente.");
    const weight = Number(form.weight),
      height = Number(form.height);
    if (weight < 20 || weight > 400 || height < 50 || height > 280)
      return toast.error("Revise peso e altura informados.");
    setSaving(true);
    try {
      await createAssessment({
        client_id: clientId,
        assessment_date: new Date().toISOString().slice(0, 10),
        weight,
        height,
        body_fat_percentage: Number(form.body_fat_percentage) || null,
        muscle_mass: Number(form.muscle_mass) || null,
        waist: Number(form.waist) || null,
        abdomen: Number(form.abdomen) || null,
        hip: Number(form.hip) || null,
        observations: form.observations || null,
      });
      toast.success("Avaliação registrada sem sobrescrever o histórico.");
      setForm({
        weight: "",
        height: "",
        body_fat_percentage: "",
        muscle_mass: "",
        waist: "",
        abdomen: "",
        hip: "",
        observations: "",
      });
      await qc.invalidateQueries({ queryKey: ["assessments"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar avaliação.");
    } finally {
      setSaving(false);
    }
  }
  const fields: [keyof typeof form, string][] = [
    ["weight", "Peso (kg)"],
    ["height", "Altura (cm)"],
    ["body_fat_percentage", "Gordura corporal (%)"],
    ["muscle_mass", "Massa muscular (kg)"],
    ["waist", "Cintura (cm)"],
    ["abdomen", "Abdômen (cm)"],
    ["hip", "Quadril (cm)"],
  ];
  return (
    <div className="space-y-5">
      <PageHeader
        title="Avaliações"
        description="Registre uma nova avaliação corporal e preserve todo o histórico."
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="size-5" />
              Nova avaliação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-1.5 block">Cliente</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {clients.data?.clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {fields.map(([key, label]) => (
                <div key={key}>
                  <Label className="mb-1.5 block text-xs">{label}</Label>
                  <Input
                    type="number"
                    step=".1"
                    value={form[key]}
                    onChange={(e) => setForm((v) => ({ ...v, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div>
              <Label className="mb-1.5 block">Observações</Label>
              <Textarea
                value={form.observations}
                onChange={(e) => setForm((v) => ({ ...v, observations: e.target.value }))}
              />
            </div>
            <Button className="w-full" onClick={save} disabled={saving}>
              <Save />
              {saving ? "Salvando..." : "Salvar avaliação"}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Histórico recente</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {history.data?.slice(0, 20).map((a) => (
              <div key={a.id} className="grid grid-cols-2 gap-2 py-3 text-sm sm:grid-cols-4">
                <strong>{new Date(a.assessment_date).toLocaleDateString("pt-BR")}</strong>
                <span>{a.weight ?? "—"} kg</span>
                <span>IMC {a.bmi ?? "—"}</span>
                <span>{a.body_fat_percentage ?? "—"}% gordura</span>
              </div>
            ))}
            {!history.data?.length && (
              <p className="p-6 text-center text-sm text-muted-foreground">
                Nenhuma avaliação cadastrada.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
