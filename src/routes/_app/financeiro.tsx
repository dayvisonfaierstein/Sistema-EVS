import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp, TrendingDown, Wallet, ShoppingCart, Plus } from "lucide-react";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader, StatCard } from "@/components/layout/PageChrome";
import { contas, brl, financeiroMensal, kpis } from "@/lib/mockData";
import { PendingModuleBanner } from "@/components/layout/PendingModuleBanner";

export const Route = createFileRoute("/_app/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — Espaço+" }] }),
  component: Financeiro,
});

function statusColor(s: string) {
  if (s === "Pago") return "border-success/30 bg-success/15 text-success";
  if (s === "Pendente")
    return "border-[color:var(--warning)]/30 bg-[color:var(--warning)]/15 text-[color:var(--warning)]";
  return "border-destructive/30 bg-destructive/15 text-destructive";
}

function Financeiro() {
  const receber = contas.filter((c) => c.tipo === "Receber");
  const pagar = contas.filter((c) => c.tipo === "Pagar");
  return (
    <div className="space-y-5">
      <PendingModuleBanner />
      <PageHeader
        title="Financeiro"
        description="Fluxo de caixa, contas e resultados."
        actions={
          <Button>
            <Plus />
            Novo lançamento
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          title="Receita"
          value={brl(kpis.receitaMensal)}
          icon={TrendingUp}
          tone="success"
          trend={{ value: "+6,2%", up: true }}
        />
        <StatCard
          title="Custos"
          value={brl(kpis.despesasMensais)}
          icon={TrendingDown}
          tone="destructive"
        />
        <StatCard
          title="Lucro"
          value={brl(kpis.lucroEstimado)}
          icon={Wallet}
          trend={{ value: "+9,4%", up: true }}
        />
        <StatCard title="Ticket médio" value={brl(148)} icon={ShoppingCart} tone="info" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fluxo mensal</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={financeiroMensal}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickFormatter={(v) => `${v / 1000}k`}
              />
              <Tooltip
                formatter={(v: number) => brl(v)}
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                }}
              />
              <Legend />
              <Bar dataKey="receita" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="custos" fill="var(--chart-4)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="lucro" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Tabs defaultValue="receber">
        <TabsList>
          <TabsTrigger value="receber">A receber ({receber.length})</TabsTrigger>
          <TabsTrigger value="pagar">A pagar ({pagar.length})</TabsTrigger>
        </TabsList>
        {[
          ["receber", receber],
          ["pagar", pagar],
        ].map(([k, arr]) => (
          <TabsContent key={k as string} value={k as string}>
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(arr as typeof contas).map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.descricao}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{c.categoria}</Badge>
                        </TableCell>
                        <TableCell>{c.vencimento}</TableCell>
                        <TableCell className="font-semibold">{brl(c.valor)}</TableCell>
                        <TableCell>
                          <Badge className={statusColor(c.status)} variant="outline">
                            {c.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
