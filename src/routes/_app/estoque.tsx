import { createFileRoute } from "@tanstack/react-router";
import {
  Package,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  XCircle,
  Clock,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader, StatCard } from "@/components/layout/PageChrome";
import { produtos, brl } from "@/lib/mockData";
import { PendingModuleBanner } from "@/components/layout/PendingModuleBanner";

export const Route = createFileRoute("/_app/estoque")({
  head: () => ({ meta: [{ title: "Estoque — Espaço+" }] }),
  component: Estoque,
});

const movs = [
  {
    data: "24/07/2026",
    produto: "Shake Fórmula 1",
    tipo: "Saída",
    qtd: 2,
    resp: "Paula",
    motivo: "Venda #1024",
    saldo: 3,
  },
  {
    data: "24/07/2026",
    produto: "Chá Termogênico",
    tipo: "Saída",
    qtd: 1,
    resp: "Ricardo",
    motivo: "Venda #1025",
    saldo: 5,
  },
  {
    data: "23/07/2026",
    produto: "Aloe Vera",
    tipo: "Entrada",
    qtd: 24,
    resp: "Paula",
    motivo: "Recebimento",
    saldo: 24,
  },
  {
    data: "23/07/2026",
    produto: "Proteína Whey",
    tipo: "Saída",
    qtd: 3,
    resp: "Beatriz",
    motivo: "Venda #1023",
    saldo: 12,
  },
  {
    data: "22/07/2026",
    produto: "Barra de Proteína",
    tipo: "Perda",
    qtd: 5,
    resp: "Paula",
    motivo: "Vencida",
    saldo: 2,
  },
];

function Estoque() {
  const custoTotal = produtos.reduce((s, p) => s + p.precoCompra * p.estoque, 0);
  const vendaTotal = produtos.reduce((s, p) => s + p.precoVenda * p.estoque, 0);
  const totalItens = produtos.reduce((s, p) => s + p.estoque, 0);
  const baixo = produtos.filter((p) => p.estoque < p.estoqueMinimo).length;
  return (
    <div className="space-y-5">
      <PendingModuleBanner />
      <PageHeader title="Estoque" description="Controle de itens, entradas, saídas e validades." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard title="Total de itens" value={totalItens} icon={Package} />
        <StatCard title="Valor de custo" value={brl(custoTotal)} icon={TrendingDown} tone="info" />
        <StatCard title="Valor de venda" value={brl(vendaTotal)} icon={TrendingUp} tone="success" />
        <StatCard title="Estoque baixo" value={baixo} icon={AlertTriangle} tone="warning" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard title="Sem estoque" value={0} icon={XCircle} tone="destructive" />
        <StatCard title="Próx. vencimento" value={2} icon={Clock} tone="warning" />
        <StatCard title="Entradas do mês" value={124} icon={ArrowDown} tone="success" />
        <StatCard title="Saídas do mês" value={198} icon={ArrowUp} tone="info" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Movimentações recentes</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movs.map((m, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm">{m.data}</TableCell>
                  <TableCell className="text-sm font-medium">{m.produto}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        m.tipo === "Entrada"
                          ? "border-success/30 bg-success/15 text-success"
                          : m.tipo === "Perda"
                            ? "border-destructive/30 bg-destructive/15 text-destructive"
                            : "border-info/30 bg-info/15 text-info"
                      }
                      variant="outline"
                    >
                      {m.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell>{m.qtd}</TableCell>
                  <TableCell className="text-sm">{m.resp}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.motivo}</TableCell>
                  <TableCell className="font-semibold">{m.saldo}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
