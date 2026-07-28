import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Ban,
  Building2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  UserRoundPlus,
  Users,
  UserX,
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/layout/PageChrome";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminDashboardMetrics } from "@/services/platform-admin";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Administração global — Espaço+" }] }),
  component: AdminDashboard,
});

const brl = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

function AdminDashboard() {
  const query = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: getAdminDashboardMetrics,
  });
  const metrics = query.data;

  return (
    <div className="space-y-7">
      <PageHeader
        title="Visão global"
        description="Indicadores consolidados de toda a plataforma Espaço+."
        actions={
          <Button asChild>
            <Link to="/admin/assinaturas">Gerenciar assinaturas</Link>
          </Button>
        }
      />

      {query.isLoading && (
        <p className="text-sm text-muted-foreground">Atualizando indicadores globais...</p>
      )}
      {query.isError && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Não foi possível carregar o painel</AlertTitle>
          <AlertDescription>{query.error.message}</AlertDescription>
        </Alert>
      )}

      <section>
        <h2 className="mb-3 text-base font-semibold">Organizações</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            title="Total de espaços"
            value={metrics?.organizations.total ?? 0}
            icon={Building2}
            tone="primary"
          />
          <StatCard
            title="Ativos"
            value={metrics?.organizations.active ?? 0}
            icon={Building2}
            tone="success"
          />
          <StatCard
            title="Pendentes"
            value={metrics?.organizations.pending ?? 0}
            icon={Clock3}
            tone="warning"
          />
          <StatCard
            title="Bloqueados"
            value={metrics?.organizations.blocked ?? 0}
            icon={Ban}
            tone="destructive"
          />
          <StatCard
            title="Cancelados"
            value={metrics?.organizations.cancelled ?? 0}
            icon={UserX}
            tone="destructive"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">Assinaturas e crescimento</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Assinaturas ativas"
            value={metrics?.subscriptions.active ?? 0}
            icon={CreditCard}
            tone="success"
          />
          <StatCard
            title="Assinaturas vencidas"
            value={metrics?.subscriptions.overdue ?? 0}
            icon={AlertTriangle}
            tone="warning"
          />
          <StatCard
            title="Receita recorrente mensal"
            value={brl(metrics?.monthlyRecurringRevenue ?? 0)}
            icon={CircleDollarSign}
            tone="success"
          />
          <StatCard
            title="Novos espaços no mês"
            value={metrics?.newOrganizations ?? 0}
            icon={UserRoundPlus}
            tone="info"
          />
          <StatCard
            title="Cancelamentos no mês"
            value={metrics?.cancellations ?? 0}
            icon={UserX}
            tone="destructive"
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader>
            <CardTitle>Base da plataforma</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border bg-muted/20 p-4">
              <Users className="mb-3 size-5 text-primary" />
              <div className="text-2xl font-bold">{metrics?.users ?? 0}</div>
              <div className="text-sm text-muted-foreground">Usuários cadastrados</div>
            </div>
            <div className="rounded-xl border bg-muted/20 p-4">
              <UserRoundPlus className="mb-3 size-5 text-primary" />
              <div className="text-2xl font-bold">{metrics?.clients ?? 0}</div>
              <div className="text-sm text-muted-foreground">Clientes atendidos</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-[color:var(--warning)]" />
              Alertas administrativos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics?.alerts.length ? (
              metrics.alerts.map((alert) => (
                <Link
                  key={alert.id}
                  to={alert.href}
                  className="block rounded-xl border p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="font-semibold">{alert.title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{alert.description}</div>
                </Link>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum alerta administrativo no momento.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
