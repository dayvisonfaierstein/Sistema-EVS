import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createExperiencePlan,
  listExperiencePlans,
  updateExperienceDay,
} from "@/services/assessments";
import type { ExperiencePlanDay } from "@/types/database";

function ExperienceDayEditor({ day, onSaved }: { day: ExperiencePlanDay; onSaved: () => void }) {
  const [form, setForm] = useState({
    breakfast: day.breakfast ?? "",
    lunch: day.lunch ?? "",
    dinner: day.dinner ?? "",
    notes: day.notes ?? "",
    completed: day.completed,
  });
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try {
      await updateExperienceDay(day.id, form);
      toast.success(`Dia ${day.day_number} atualizado.`);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao atualizar o dia.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          Dia {day.day_number}
          <span className="text-xs font-normal text-muted-foreground">
            {new Date(`${day.plan_date}T12:00:00`).toLocaleDateString("pt-BR")}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {[
          ["breakfast", "Café da manhã"],
          ["lunch", "Almoço"],
          ["dinner", "Jantar"],
        ].map(([key, label]) => (
          <div key={key}>
            <Label className="mb-1 block text-xs">{label}</Label>
            <Input
              value={form[key as keyof typeof form] as string}
              onChange={(event) =>
                setForm((current) => ({ ...current, [key]: event.target.value }))
              }
            />
          </div>
        ))}
        <div>
          <Label className="mb-1 block text-xs">Observações</Label>
          <Textarea
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={form.completed}
            onCheckedChange={(checked) =>
              setForm((current) => ({ ...current, completed: checked === true }))
            }
          />
          Dia concluído
        </label>
        <Button size="sm" onClick={save} disabled={saving}>
          <Save />
          Salvar dia
        </Button>
      </CardContent>
    </Card>
  );
}

export function ExperiencePlansPanel({ clientId }: { clientId: string }) {
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [creating, setCreating] = useState(false);
  const plans = useQuery({
    queryKey: ["experience-plans", clientId],
    queryFn: () => listExperiencePlans(clientId),
  });
  async function create() {
    setCreating(true);
    try {
      await createExperiencePlan(clientId, startDate);
      await queryClient.invalidateQueries({ queryKey: ["experience-plans", clientId] });
      toast.success("Plano de Experiência de 3 dias iniciado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao iniciar o plano.");
    } finally {
      setCreating(false);
    }
  }
  const active = plans.data?.[0];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border bg-card p-4">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <CalendarDays className="size-5 text-primary" />
            Plano de Experiência
          </h2>
          <p className="text-sm text-muted-foreground">
            Acompanhamento separado da avaliação corporal.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <Label className="mb-1 block text-xs">Data inicial</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>
          <Button onClick={create} disabled={creating}>
            <Plus />
            Iniciar plano
          </Button>
        </div>
      </div>
      {active ? (
        <>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-primary" />
            Plano iniciado em{" "}
            {new Date(`${active.started_at}T12:00:00`).toLocaleDateString("pt-BR")}
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            {active.experience_plan_days
              ?.slice()
              .sort((a, b) => a.day_number - b.day_number)
              .map((day) => (
                <ExperienceDayEditor
                  key={day.id}
                  day={day}
                  onSaved={() =>
                    queryClient.invalidateQueries({ queryKey: ["experience-plans", clientId] })
                  }
                />
              ))}
          </div>
        </>
      ) : (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nenhum plano iniciado para este cliente.
        </p>
      )}
    </div>
  );
}
