import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Boxes,
  ClipboardList,
  DollarSign,
  LogIn,
  Package,
  PackageX,
  Plus,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/layout/PageChrome";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getDashboardMetrics } from "@/services/dashboard";
import { useAuth } from "@/contexts/AuthContext";
import { isSupabaseConfigured } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Espaço+" }] }),
  component: Dashboard,
});

const brl = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
const number = (value: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
const trend = (value = 0, inverse = false) => ({
  value: `${Math.abs(value).toFixed(1).replace(".", ",")}% vs. mês anterior`,
  up: inverse ? value <= 0 : value >= 0,
});

function Dashboard() {
  const { profile, can } = useAuth();
  const configured = isSupabaseConfigured();
  const query = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboardMetrics,
    enabled: configured,
  });
  const m = query.data;
  const financial = can("finance");

  return (
    <div className="space-y-7">
      <PageHeader
        title={`Olá, ${profile?.full_name?.split(" ")[0] || "gestor"}`}
        description="Visão geral do seu Espaço Vida Saudável hoje."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/acessos">
                <LogIn />
                Registrar acesso
              </Link>
            </Button>
            <Button asChild>
              <Link to="/clientes/novo">
                <Plus />
                Novo cliente
              </Link>
            </Button>
          </div>
        }
      />
      {!configured && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Conecte o Supabase no arquivo .env para substituir os indicadores por dados reais.
          </CardContent>
        </Card>
      )}
      {query.isLoading && (
        <p className="text-sm text-muted-foreground">Atualizando indicadores...</p>
      )}

      <section aria-labelledby="operacao-title">
        <h2 id="operacao-title" className="mb-3 text-base font-semibold">
          Operação
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Clientes ativos"
            value={m?.activeClients ?? 0}
            icon={Users}
            tone="success"
          />
          <StatCard title="Novos no mês" value={m?.newClients ?? 0} icon={Plus} tone="primary" />
          <StatCard
            title="Acessos hoje"
            value={m?.todayAccess ?? 0}
            hint={`${m?.monthAccess ?? 0} no mês`}
            icon={LogIn}
            tone="info"
          />
          <StatCard
            title="Avaliações no mês"
            value={m?.assessments ?? 0}
            icon={ClipboardList}
            tone="warning"
          />
        </div>
      </section>

      <section aria-labelledby="commercial-title">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 id="commercial-title" className="text-base font-semibold">
              Visão comercial
            </h2>
            <p className="text-sm text-muted-foreground">
              Estoque, consumo, PV e perdas consolidados.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/relatorios">Ver relatórios</Link>
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Produtos cadastrados"
            value={m?.productsCount ?? 0}
            hint="produtos ativos"
            icon={Package}
            tone="success"
          />
          <StatCard
            title="Estoque baixo"
            value={m?.lowStockCount ?? 0}
            hint="produtos"
            icon={Boxes}
            tone="warning"
          />
          <StatCard
            title="Produtos sem estoque"
            value={m?.outOfStockCount ?? 0}
            icon={PackageX}
            tone="destructive"
          />
          <StatCard
            title="Valor do estoque"
            value={brl(m?.stockValue ?? 0)}
            icon={Wallet}
            tone="success"
          />
          <StatCard
            title="PV disponível"
            value={number(m?.stockPv ?? 0)}
            hint="saldo atual"
            icon={TrendingUp}
            tone="info"
          />
          <StatCard
            title="PV consumido"
            value={number(m?.pvConsumed ?? 0)}
            hint="no mês"
            icon={Activity}
            tone="primary"
            trend={trend(m?.trends.pvConsumed)}
            sparkline={m?.sparklines.pvConsumed}
          />
          <StatCard
            title="Custo consumido"
            value={brl(m?.consumptionCost ?? 0)}
            hint="no mês"
            icon={DollarSign}
            tone="warning"
            trend={trend(m?.trends.consumptionCost)}
            sparkline={m?.sparklines.consumptionCost}
          />
          <StatCard
            title="Perdas do mês"
            value={brl(m?.lossCost ?? 0)}
            icon={TrendingDown}
            tone="destructive"
            trend={trend(m?.trends.lossCost, true)}
            sparkline={m?.sparklines.lossCost}
          />
        </div>
      </section>

      {financial && (
        <section aria-labelledby="financial-title">
          <h2 id="financial-title" className="mb-3 text-base font-semibold">
            Financeiro
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              title="Receita mensal"
              value={brl(m?.revenue ?? 0)}
              icon={TrendingUp}
              tone="success"
            />
            <StatCard
              title="Despesas mensais"
              value={brl(m?.expenses ?? 0)}
              icon={TrendingDown}
              tone="destructive"
            />
            <StatCard
              title="Lucro estimado"
              value={brl(m?.profit ?? 0)}
              icon={Wallet}
              tone="success"
            />
          </div>
        </section>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-[color:var(--warning)]" />
            Produtos que exigem atenção
          </CardTitle>
        </CardHeader>
        <CardContent>
          {m?.lowStock.length ? (
            <div className="divide-y">
              {m.lowStock.map((product) => (
                <div key={product.id} className="flex justify-between gap-4 py-3 text-sm">
                  <span>{product.name}</span>
                  <strong>
                    {number(Number(product.current_stock))} / mínimo{" "}
                    {number(Number(product.minimum_stock))}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum produto abaixo do estoque mínimo.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
