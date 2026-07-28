import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, PackageCheck, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageChrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { listAdminPlans, saveAdminPlan, type PlanInput } from "@/services/platform-admin";
import type { Plan, PlanBillingInterval } from "@/types/database";

export const Route = createFileRoute("/admin/planos")({
  head: () => ({ meta: [{ title: "Planos — Espaço+ Admin" }] }),
  component: PlansPage,
});

const emptyPlan: PlanInput = {
  code: "",
  name: "",
  description: "",
  price: 0,
  billing_interval: "monthly",
  trial_days: 0,
  grace_days: 5,
  active: true,
};

const intervals: Record<PlanBillingInterval, string> = {
  monthly: "Mensal",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  annual: "Anual",
};

const brl = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

function PlansPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string>();
  const [form, setForm] = useState<PlanInput>(emptyPlan);
  const [formError, setFormError] = useState<string | null>(null);
  const query = useQuery({ queryKey: ["admin-plans"], queryFn: listAdminPlans });
  const mutation = useMutation({
    mutationFn: () => saveAdminPlan(form, editingId),
    onSuccess: async () => {
      setFormError(null);
      toast.success(editingId ? "Plano atualizado." : "Plano criado.");
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (error) => {
      const message =
        error.message.includes("plans_code_key") ||
        error.message.toLowerCase().includes("duplicate key")
          ? "Já existe um plano cadastrado com este código."
          : error.message.toLowerCase().includes("row-level security")
            ? "O Supabase não reconheceu este usuário como Super Admin para cadastrar planos."
            : error.message;
      setFormError(message);
      toast.error(message);
    },
  });

  function startNew() {
    setEditingId(undefined);
    setForm(emptyPlan);
    setFormError(null);
    setOpen(true);
  }
  function startEdit(plan: Plan) {
    setEditingId(plan.id);
    setFormError(null);
    setForm({
      code: plan.code,
      name: plan.name,
      description: plan.description,
      price: Number(plan.price),
      billing_interval: plan.billing_interval,
      trial_days: plan.trial_days,
      grace_days: plan.grace_days,
      active: plan.active,
    });
    setOpen(true);
  }

  function savePlan() {
    setFormError(null);
    if (!/^[a-z0-9][a-z0-9_-]*$/i.test(form.code.trim())) {
      setFormError("Use no código apenas letras, números, hífen ou sublinhado.");
      return;
    }
    if (form.name.trim().length < 2) {
      setFormError("Informe o nome do plano.");
      return;
    }
    if (!Number.isFinite(Number(form.price)) || Number(form.price) < 0) {
      setFormError("Informe um valor válido para o plano.");
      return;
    }
    if (form.trial_days < 0 || form.grace_days < 0) {
      setFormError("Os dias de teste e carência não podem ser negativos.");
      return;
    }
    mutation.mutate();
  }

  return (
    <div>
      <PageHeader
        title="Planos"
        description="Configure os planos comerciais oferecidos aos Espaços."
        actions={
          <Button onClick={startNew}>
            <Plus />
            Novo plano
          </Button>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {query.data?.map((plan) => (
          <Card key={plan.id} className={!plan.active ? "opacity-70" : undefined}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
                  <PackageCheck className="size-5" />
                </div>
                <Badge variant={plan.active ? "default" : "outline"}>
                  {plan.active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <div className="mt-5">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {plan.code}
                </div>
                <h2 className="mt-1 text-xl font-bold">{plan.name}</h2>
                <p className="mt-2 min-h-10 text-sm text-muted-foreground">
                  {plan.description || "Sem descrição comercial."}
                </p>
              </div>
              <div className="mt-5 border-t pt-4">
                <span className="text-2xl font-bold">{brl(Number(plan.price))}</span>
                <span className="ml-1 text-sm text-muted-foreground">
                  / {intervals[plan.billing_interval].toLocaleLowerCase("pt-BR")}
                </span>
                <div className="mt-2 text-xs text-muted-foreground">
                  {plan.grace_days} dias de carência • {plan.trial_days} dias de teste
                </div>
              </div>
              <Button variant="outline" className="mt-5 w-full" onClick={() => startEdit(plan)}>
                <Edit3 />
                Editar plano
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      {!query.isLoading && !query.data?.length && (
        <Card>
          <CardContent className="p-12 text-center text-sm text-muted-foreground">
            Nenhum plano cadastrado. Crie o primeiro plano comercial.
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar plano" : "Novo plano"}</DialogTitle>
            <DialogDescription>
              Valores e regras usados nas novas assinaturas da plataforma.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="plan-code">Código</Label>
                <Input
                  id="plan-code"
                  value={form.code}
                  disabled={Boolean(editingId)}
                  onChange={(event) => setForm({ ...form, code: event.target.value })}
                  placeholder="profissional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-name">Nome</Label>
                <Input
                  id="plan-name"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-description">Descrição</Label>
              <Textarea
                id="plan-description"
                value={form.description ?? ""}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="plan-price">Valor</Label>
                <Input
                  id="plan-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) => setForm({ ...form, price: Number(event.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-interval">Periodicidade</Label>
                <select
                  id="plan-interval"
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={form.billing_interval}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      billing_interval: event.target.value as PlanBillingInterval,
                    })
                  }
                >
                  {Object.entries(intervals).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="plan-trial">Dias de teste</Label>
                <Input
                  id="plan-trial"
                  type="number"
                  min="0"
                  value={form.trial_days}
                  onChange={(event) => setForm({ ...form, trial_days: Number(event.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-grace">Dias de carência</Label>
                <Input
                  id="plan-grace"
                  type="number"
                  min="0"
                  value={form.grace_days}
                  onChange={(event) => setForm({ ...form, grace_days: Number(event.target.value) })}
                />
              </div>
            </div>
            <label className="flex items-center justify-between rounded-lg border p-3 text-sm">
              Plano disponível para novas assinaturas
              <Switch
                checked={form.active}
                onCheckedChange={(active) => setForm({ ...form, active })}
              />
            </label>
          </div>
          <DialogFooter>
            {formError && (
              <div
                role="alert"
                className="mb-2 w-full rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-left text-sm font-medium text-destructive sm:mb-0 sm:mr-auto"
              >
                {formError}
              </div>
            )}
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!form.code.trim() || !form.name.trim() || mutation.isPending}
              onClick={savePlan}
            >
              {mutation.isPending ? "Salvando..." : "Salvar plano"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
