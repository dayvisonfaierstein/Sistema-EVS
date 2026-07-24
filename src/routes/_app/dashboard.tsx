import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ClipboardList,
  DollarSign,
  LogIn,
  Package,
  Plus,
  TrendingUp,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/PageChrome";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getDashboardMetrics } from "@/services/dashboard";
import { useAuth } from "@/contexts/AuthContext";
import { isSupabaseConfigured } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Espaço+" }] }),
  component: Dashboard,
});
const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
function Dashboard() {
  const { profile, can } = useAuth(),
    configured = isSupabaseConfigured();
  const query = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboardMetrics,
    enabled: configured,
  });
  const m = query.data;
  const financial = can("finance");
  const cards: [string, string | number, LucideIcon][] = [
    ["Clientes ativos", m?.activeClients ?? 0, Users],
    ["Novos no mês", m?.newClients ?? 0, Plus],
    ["Acessos hoje", m?.todayAccess ?? 0, LogIn],
    ["Acessos no mês", m?.monthAccess ?? 0, Activity],
    ["Avaliações no mês", m?.assessments ?? 0, ClipboardList],
    ...(financial
      ? ([
          ["Receita", brl(m?.revenue ?? 0), DollarSign],
          ["Despesas", brl(m?.expenses ?? 0), DollarSign],
          ["Lucro estimado", brl(m?.profit ?? 0), TrendingUp],
        ] as [string, string | number, LucideIcon][])
      : []),
  ];
  return (
    <div className="space-y-5">
      <PageHeader
        title={`Olá, ${profile?.full_name?.split(" ")[0] || "gestor"}`}
        description="Indicadores atualizados com os dados da sua organização."
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, Icon]) => (
          <Card key={label as string}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
                <Icon className="size-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="text-2xl font-bold">{value}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="size-5" />
            Estoque baixo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {m?.lowStock.length ? (
            <div className="divide-y">
              {m.lowStock.map((p) => (
                <div key={p.id} className="flex justify-between py-3 text-sm">
                  <span>{p.name}</span>
                  <strong>
                    {p.current_stock} / mínimo {p.minimum_stock}
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
