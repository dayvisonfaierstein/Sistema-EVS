import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  CalendarRange,
  CircleDollarSign,
  FileSpreadsheet,
  Package,
  Printer,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { PageHeader, StatCard } from "@/components/layout/PageChrome";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCommercialReport, type CommercialReport } from "@/services/commercial-reports";
import { lossReasonLabels, type LossReason } from "@/services/inventory";
import { isSupabaseConfigured } from "@/integrations/supabase/client";
import { RequirePermission } from "@/components/auth/RequirePermission";

export const Route = createFileRoute("/_app/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios comerciais — Espaço+" }] }),
  component: CommercialReports,
});

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

function dateInput(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function currentMonth() {
  const now = new Date();
  return {
    from: dateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: dateInput(now),
  };
}

const movementLabels: Record<string, string> = {
  purchase: "Compra",
  positive_adjustment: "Ajuste positivo",
  return: "Devolução",
  consumption: "Consumo",
  sale: "Venda",
  loss: "Perda",
  expiration: "Vencimento",
  negative_adjustment: "Ajuste negativo",
};

function exportCsv(data: CommercialReport, from: string, to: string) {
  const rows: Array<Array<string | number>> = [
    ["RELATÓRIO COMERCIAL ESPAÇO+", `${from} a ${to}`],
    [],
    ["INDICADOR", "VALOR"],
    ["Produtos cadastrados", data.stock.products],
    ["Estoque baixo", data.stock.low],
    ["Produtos sem estoque", data.stock.empty],
    ["Valor do estoque", data.stock.value.toFixed(2)],
    ["PV comprado", data.pv.purchased.toFixed(2)],
    ["PV consumido", data.pv.consumed.toFixed(2)],
    ["PV perdido", data.pv.lost.toFixed(2)],
    ["PV restante", data.pv.remaining.toFixed(2)],
    ["Custo consumido", data.period.cost.toFixed(2)],
    ["Receita estimada", data.period.revenue.toFixed(2)],
    ["Lucro bruto", data.period.profit.toFixed(2)],
    ["Margem (%)", data.period.margin.toFixed(2)],
    [],
    ["PRODUTOS MAIS CONSUMIDOS"],
    ["Produto", "Quantidade", "Custo", "PV"],
    ...data.topProducts.map((item) => [
      item.name,
      item.quantity,
      item.cost.toFixed(2),
      item.pv.toFixed(2),
    ]),
    [],
    ["MOVIMENTAÇÕES"],
    ["Data", "Produto", "Tipo", "Quantidade", "Unidade", "Motivo", "Custo", "PV"],
    ...data.movements.map((item) => [
      new Date(item.date).toLocaleString("pt-BR"),
      item.product,
      movementLabels[item.type] ?? item.type,
      item.quantity,
      item.unit,
      item.reason,
      item.cost.toFixed(2),
      item.pv.toFixed(2),
    ]),
    [],
    ["LOTES E VALIDADE"],
    ["Produto", "Lote", "Validade", "Quantidade", "Unidade", "Valor"],
    ...data.batches.map((item) => [
      item.product,
      item.batch,
      item.expirationDate
        ? new Date(`${item.expirationDate}T12:00:00`).toLocaleDateString("pt-BR")
        : "Sem validade",
      item.quantity,
      item.unit,
      item.value.toFixed(2),
    ]),
  ];
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(";"))
    .join("\r\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio-comercial-${from}-${to}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function CommercialReports() {
  const initial = useMemo(currentMonth, []);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const configured = isSupabaseConfigured();
  const report = useQuery({
    queryKey: ["commercial-report", from, to],
    queryFn: () => getCommercialReport(from, to),
    enabled: configured && Boolean(from && to),
  });
  const data = report.data;

  function setPreset(days?: number) {
    const now = new Date();
    if (days) {
      const start = new Date(now);
      start.setDate(start.getDate() - (days - 1));
      setFrom(dateInput(start));
    } else {
      setFrom(dateInput(new Date(now.getFullYear(), now.getMonth(), 1)));
    }
    setTo(dateInput(now));
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Relatórios comerciais"
        description="Estoque, custos, Pontos de Volume, consumo, preparações e perdas."
        actions={
          <>
            <RequirePermission anyOf={["inventory.export", "finance.reports.export"]}>
              <Button
                variant="outline"
                disabled={!data}
                onClick={() => data && exportCsv(data, from, to)}
              >
                <FileSpreadsheet />
                Exportar CSV
              </Button>
            </RequirePermission>
            <RequirePermission anyOf={["reports.inventory", "reports.finance"]}>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer />
                Imprimir / PDF
              </Button>
            </RequirePermission>
          </>
        }
      />

      <Card className="print:hidden">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="mr-2 flex items-center gap-2 text-sm font-medium">
            <CalendarRange className="size-4 text-primary" />
            Período
          </div>
          <Button size="sm" variant="outline" onClick={() => setPreset(1)}>
            Hoje
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPreset(7)}>
            7 dias
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPreset(30)}>
            30 dias
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPreset()}>
            Este mês
          </Button>
          <label className="ml-auto grid gap-1 text-xs text-muted-foreground">
            De
            <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Até
            <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
        </CardContent>
      </Card>

      {report.isLoading && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Calculando os indicadores comerciais...
          </CardContent>
        </Card>
      )}
      {report.error && (
        <Card className="border-destructive/40">
          <CardContent className="p-5 text-sm text-destructive">{report.error.message}</CardContent>
        </Card>
      )}

      {data && (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Posição atual do estoque</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard title="Produtos" value={data.stock.products} icon={Package} />
              <StatCard
                title="Estoque baixo"
                value={data.stock.low}
                icon={AlertTriangle}
                tone="warning"
              />
              <StatCard
                title="Sem estoque"
                value={data.stock.empty}
                icon={Boxes}
                tone="destructive"
              />
              <StatCard
                title="Valor em estoque"
                value={currency.format(data.stock.value)}
                icon={CircleDollarSign}
                tone="success"
              />
              <StatCard
                title="PV disponível"
                value={decimal.format(data.stock.pv)}
                icon={TrendingUp}
                tone="info"
              />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Resultado do período</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Porções servidas"
                value={decimal.format(data.period.servings)}
                hint={`${data.period.consumptions} registros de consumo`}
                icon={Package}
              />
              <StatCard
                title="PV consumido"
                value={decimal.format(data.period.pvConsumed)}
                icon={TrendingUp}
                tone="info"
              />
              <StatCard
                title="Custo consumido"
                value={currency.format(data.period.cost)}
                icon={CircleDollarSign}
                tone="warning"
              />
              <StatCard
                title="Perdas"
                value={currency.format(data.period.lossCost)}
                hint={`${decimal.format(data.period.lossPv)} PV perdidos`}
                icon={TrendingDown}
                tone="destructive"
              />
              <StatCard
                title="Receita estimada"
                value={currency.format(data.period.revenue)}
                icon={CircleDollarSign}
                tone="success"
              />
              <StatCard
                title="Lucro bruto"
                value={currency.format(data.period.profit)}
                icon={TrendingUp}
                tone="success"
              />
              <StatCard
                title="Margem"
                value={`${decimal.format(data.period.margin)}%`}
                icon={TrendingUp}
                tone="primary"
              />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Balanço de Pontos de Volume</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="PV comprado"
                value={decimal.format(data.pv.purchased)}
                hint="entradas no período"
                icon={TrendingUp}
                tone="success"
              />
              <StatCard
                title="PV consumido"
                value={decimal.format(data.pv.consumed)}
                icon={Package}
                tone="info"
              />
              <StatCard
                title="PV perdido"
                value={decimal.format(data.pv.lost)}
                icon={TrendingDown}
                tone="destructive"
              />
              <StatCard
                title="PV restante"
                value={decimal.format(data.pv.remaining)}
                hint="saldo atual do estoque"
                icon={Boxes}
                tone="primary"
              />
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Evolução nos últimos 6 meses</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  className="h-[280px] w-full"
                  config={{
                    revenue: { label: "Receita", color: "#16a34a" },
                    cost: { label: "Custo", color: "#f59e0b" },
                  }}
                >
                  <LineChart data={data.monthly}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} width={54} />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent formatter={(value) => currency.format(+value)} />
                      }
                    />
                    <Line
                      dataKey="revenue"
                      type="monotone"
                      stroke="var(--color-revenue)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      dataKey="cost"
                      type="monotone"
                      stroke="var(--color-cost)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>PV consumido nos últimos 6 meses</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  className="h-[280px] w-full"
                  config={{ pv: { label: "PV", color: "#15803d" } }}
                >
                  <BarChart data={data.monthly}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} width={46} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="pv" fill="var(--color-pv)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Preparações e produtos servidos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Preparação ou produto</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                    <TableHead className="text-right">Lucro bruto</TableHead>
                    <TableHead className="text-right">Margem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topPreparations.map((item) => (
                    <TableRow key={item.name}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">{decimal.format(item.quantity)}</TableCell>
                      <TableCell className="text-right">{currency.format(item.revenue)}</TableCell>
                      <TableCell className="text-right">{currency.format(item.cost)}</TableCell>
                      <TableCell className="text-right">{currency.format(item.profit)}</TableCell>
                      <TableCell className="text-right">{decimal.format(item.margin)}%</TableCell>
                    </TableRow>
                  ))}
                  {!data.topPreparations.length && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        Nenhum consumo registrado no período.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Perdas e desperdícios por motivo</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Motivo</TableHead>
                    <TableHead className="text-right">Lançamentos</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Custo perdido</TableHead>
                    <TableHead className="text-right">PV perdido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.losses.map((loss) => (
                    <TableRow key={loss.reason}>
                      <TableCell className="font-medium">
                        {lossReasonLabels[loss.reason as LossReason] ?? "Outro"}
                      </TableCell>
                      <TableCell className="text-right">{loss.entries}</TableCell>
                      <TableCell className="text-right">{decimal.format(loss.quantity)}</TableCell>
                      <TableCell className="text-right">{currency.format(loss.cost)}</TableCell>
                      <TableCell className="text-right">{decimal.format(loss.pv)}</TableCell>
                    </TableRow>
                  ))}
                  {!data.losses.length && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        Nenhuma perda registrada no período.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <RankingCard
              title="Produtos mais consumidos"
              rows={data.topProducts.map((item) => ({
                name: item.name,
                primary: `${decimal.format(item.quantity)} unidades de consumo`,
                secondary: `${currency.format(item.cost)} · ${decimal.format(item.pv)} PV`,
              }))}
            />
            <RankingCard
              title="Consumo por categoria"
              rows={data.categories.map((item) => ({
                name: item.name,
                primary: currency.format(item.cost),
                secondary: `${decimal.format(item.quantity)} consumidos · ${decimal.format(item.pv)} PV`,
              }))}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Movimentações no período</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Movimentação</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                    <TableHead className="text-right">PV</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.movements.map((movement, index) => (
                    <TableRow key={`${movement.date}-${movement.product}-${index}`}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(movement.date).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="font-medium">{movement.product}</TableCell>
                      <TableCell>{movementLabels[movement.type] ?? movement.type}</TableCell>
                      <TableCell className="text-right">
                        {decimal.format(movement.quantity)} {movement.unit}
                      </TableCell>
                      <TableCell>{movement.reason || "—"}</TableCell>
                      <TableCell className="text-right">{currency.format(movement.cost)}</TableCell>
                      <TableCell className="text-right">{decimal.format(movement.pv)}</TableCell>
                    </TableRow>
                  ))}
                  {!data.movements.length && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        Nenhuma movimentação no período.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="size-5 text-primary" />
                Lotes e validade
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.batches.map((batch) => {
                    const expiration = batch.expirationDate
                      ? new Date(`${batch.expirationDate}T12:00:00`)
                      : null;
                    const days = expiration
                      ? Math.ceil((expiration.getTime() - Date.now()) / 86_400_000)
                      : null;
                    return (
                      <TableRow key={batch.id}>
                        <TableCell className="font-medium">{batch.product}</TableCell>
                        <TableCell>{batch.batch}</TableCell>
                        <TableCell
                          className={
                            days !== null && days <= 30 ? "font-semibold text-destructive" : ""
                          }
                        >
                          {expiration ? expiration.toLocaleDateString("pt-BR") : "Sem validade"}
                          {days !== null && days >= 0 && days <= 30 ? ` · ${days} dias` : ""}
                          {days !== null && days < 0 ? " · vencido" : ""}
                        </TableCell>
                        <TableCell className="text-right">
                          {decimal.format(batch.quantity)} {batch.unit}
                        </TableCell>
                        <TableCell className="text-right">{currency.format(batch.value)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {!data.batches.length && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        Nenhum lote ativo com saldo.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function RankingCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ name: string; primary: string; secondary: string }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="divide-y">
        {rows.map((row, index) => (
          <div key={row.name} className="flex items-center gap-3 py-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{row.name}</p>
              <p className="text-xs text-muted-foreground">{row.secondary}</p>
            </div>
            <strong className="text-sm">{row.primary}</strong>
          </div>
        ))}
        {!rows.length && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum dado no período selecionado.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
