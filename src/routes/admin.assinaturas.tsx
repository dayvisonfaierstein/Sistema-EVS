import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, CheckCircle2, CreditCard, Plus } from "lucide-react";
import { useMemo, useState } from "react";
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
import {
  createAdminSubscription,
  createAdminSubscriptionPayment,
  listAdminOrganizations,
  listAdminPlans,
  listAdminSubscriptions,
  listSubscriptionPayments,
  registerAdminSubscriptionPayment,
  setAdminSubscriptionStatus,
  type AdminSubscription,
} from "@/services/platform-admin";
import type { SubscriptionStatus } from "@/types/database";

export const Route = createFileRoute("/admin/assinaturas")({
  head: () => ({ meta: [{ title: "Assinaturas — Espaço+ Admin" }] }),
  component: SubscriptionsPage,
});

const statusLabels: Record<SubscriptionStatus, string> = {
  pending: "Pendente",
  active: "Ativa",
  overdue: "Vencida",
  grace_period: "Carência",
  blocked: "Bloqueada",
  cancelled: "Cancelada",
};
const brl = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
const isoDate = (date = new Date()) => date.toISOString().slice(0, 10);
const endOfMonth = () => {
  const now = new Date();
  return isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
};

function SubscriptionsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [billingSubscription, setBillingSubscription] = useState<AdminSubscription>();
  const [subscriptionForm, setSubscriptionForm] = useState({
    organizationId: "",
    planId: "",
    startsOn: isoDate(),
    dueDay: 10,
  });
  const [paymentForm, setPaymentForm] = useState({
    periodStart: isoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    periodEnd: endOfMonth(),
    dueDate: isoDate(),
  });

  const subscriptions = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: listAdminSubscriptions,
  });
  const organizations = useQuery({
    queryKey: ["admin-organizations"],
    queryFn: listAdminOrganizations,
  });
  const plans = useQuery({ queryKey: ["admin-plans"], queryFn: listAdminPlans });
  const payments = useQuery({
    queryKey: ["admin-subscription-payments", billingSubscription?.id],
    queryFn: () => listSubscriptionPayments(billingSubscription?.id),
    enabled: Boolean(billingSubscription),
  });
  const availableOrganizations = useMemo(() => {
    const subscribed = new Set(
      subscriptions.data
        ?.filter((subscription) => subscription.status !== "cancelled")
        .map((subscription) => subscription.organization_id),
    );
    return organizations.data?.filter((organization) => !subscribed.has(organization.id)) ?? [];
  }, [organizations.data, subscriptions.data]);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-subscription-payments"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] }),
    ]);
  };
  const createMutation = useMutation({
    mutationFn: () => createAdminSubscription(subscriptionForm),
    onSuccess: async () => {
      toast.success("Assinatura criada.");
      setCreateOpen(false);
      await refresh();
    },
    onError: (error) => toast.error(error.message),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SubscriptionStatus }) =>
      setAdminSubscriptionStatus(id, status),
    onSuccess: async () => {
      toast.success("Situação atualizada.");
      await refresh();
    },
    onError: (error) => toast.error(error.message),
  });
  const generatePaymentMutation = useMutation({
    mutationFn: () =>
      createAdminSubscriptionPayment({
        subscriptionId: billingSubscription!.id,
        ...paymentForm,
      }),
    onSuccess: async () => {
      toast.success("Mensalidade gerada.");
      await refresh();
    },
    onError: (error) => toast.error(error.message),
  });
  const payMutation = useMutation({
    mutationFn: (id: string) => registerAdminSubscriptionPayment(id, "manual"),
    onSuccess: async () => {
      toast.success("Pagamento registrado.");
      await refresh();
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div>
      <PageHeader
        title="Assinaturas"
        description="Contratos, situações e mensalidades dos Espaços."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus />
            Nova assinatura
          </Button>
        }
      />
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Organização</th>
                  <th className="px-4 py-3">Plano</th>
                  <th className="px-4 py-3">Valor contratado</th>
                  <th className="px-4 py-3">Próximo vencimento</th>
                  <th className="px-4 py-3">Situação</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {subscriptions.data?.map((subscription) => (
                  <tr key={subscription.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-semibold">
                      {subscription.organization?.trade_name ??
                        subscription.organization?.legal_name ??
                        "Organização"}
                    </td>
                    <td className="px-4 py-3">{subscription.plan?.name ?? "—"}</td>
                    <td className="px-4 py-3">{brl(Number(subscription.price_snapshot))}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {subscription.next_due_date
                        ? new Date(`${subscription.next_due_date}T12:00:00`).toLocaleDateString(
                            "pt-BR",
                          )
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        aria-label="Situação da assinatura"
                        className="h-8 rounded-md border bg-background px-2 text-xs font-medium"
                        value={subscription.status}
                        disabled={subscription.status === "cancelled" || statusMutation.isPending}
                        onChange={(event) =>
                          statusMutation.mutate({
                            id: subscription.id,
                            status: event.target.value as SubscriptionStatus,
                          })
                        }
                      >
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBillingSubscription(subscription)}
                      >
                        <CreditCard />
                        Mensalidades
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!subscriptions.isLoading && !subscriptions.data?.length && (
            <p className="p-12 text-center text-sm text-muted-foreground">
              Nenhuma assinatura cadastrada.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova assinatura</DialogTitle>
            <DialogDescription>
              Vincule uma organização sem assinatura vigente a um plano ativo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="subscription-organization">Organização</Label>
              <select
                id="subscription-organization"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={subscriptionForm.organizationId}
                onChange={(event) =>
                  setSubscriptionForm({
                    ...subscriptionForm,
                    organizationId: event.target.value,
                  })
                }
              >
                <option value="">Selecione...</option>
                {availableOrganizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.trade_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subscription-plan">Plano</Label>
              <select
                id="subscription-plan"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={subscriptionForm.planId}
                onChange={(event) =>
                  setSubscriptionForm({ ...subscriptionForm, planId: event.target.value })
                }
              >
                <option value="">Selecione...</option>
                {plans.data
                  ?.filter((plan) => plan.active)
                  .map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} — {brl(Number(plan.price))}
                    </option>
                  ))}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="subscription-start">Início</Label>
                <Input
                  id="subscription-start"
                  type="date"
                  value={subscriptionForm.startsOn}
                  onChange={(event) =>
                    setSubscriptionForm({ ...subscriptionForm, startsOn: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subscription-due-day">Dia do vencimento</Label>
                <Input
                  id="subscription-due-day"
                  type="number"
                  min="1"
                  max="28"
                  value={subscriptionForm.dueDay}
                  onChange={(event) =>
                    setSubscriptionForm({
                      ...subscriptionForm,
                      dueDay: Number(event.target.value),
                    })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={
                !subscriptionForm.organizationId ||
                !subscriptionForm.planId ||
                createMutation.isPending
              }
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Criando..." : "Criar assinatura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(billingSubscription)}
        onOpenChange={(open) => !open && setBillingSubscription(undefined)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Mensalidades</DialogTitle>
            <DialogDescription>
              {billingSubscription?.organization?.trade_name} • {billingSubscription?.plan?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 rounded-xl border bg-muted/20 p-3 sm:grid-cols-4">
            <Input
              aria-label="Início do período"
              type="date"
              value={paymentForm.periodStart}
              onChange={(event) =>
                setPaymentForm({ ...paymentForm, periodStart: event.target.value })
              }
            />
            <Input
              aria-label="Fim do período"
              type="date"
              value={paymentForm.periodEnd}
              onChange={(event) =>
                setPaymentForm({ ...paymentForm, periodEnd: event.target.value })
              }
            />
            <Input
              aria-label="Vencimento"
              type="date"
              value={paymentForm.dueDate}
              onChange={(event) => setPaymentForm({ ...paymentForm, dueDate: event.target.value })}
            />
            <Button
              onClick={() => generatePaymentMutation.mutate()}
              disabled={generatePaymentMutation.isPending}
            >
              <CalendarPlus />
              Gerar
            </Button>
          </div>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {payments.data?.map((payment) => (
              <div
                key={payment.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
              >
                <div>
                  <div className="font-semibold">
                    {new Date(`${payment.due_date}T12:00:00`).toLocaleDateString("pt-BR")} •{" "}
                    {brl(Number(payment.amount))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Referência: {payment.reference_period_start} a {payment.reference_period_end}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={payment.status === "paid" ? "default" : "outline"}>
                    {payment.status === "paid"
                      ? "Pago"
                      : payment.status === "overdue"
                        ? "Vencido"
                        : "Pendente"}
                  </Badge>
                  {payment.status !== "paid" &&
                    !["cancelled", "refunded"].includes(payment.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => payMutation.mutate(payment.id)}
                      >
                        <CheckCircle2 />
                        Dar baixa
                      </Button>
                    )}
                </div>
              </div>
            ))}
            {!payments.isLoading && !payments.data?.length && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma mensalidade gerada.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
