import { createFileRoute } from "@tanstack/react-router";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Users,
  LogIn,
  Activity,
  ShoppingCart,
  Package,
  Wallet,
  TrendingUp,
  UserX,
  Cake,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageChrome";

export const Route = createFileRoute("/_app/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Espaço+" }] }),
  component: Relatorios,
});

const rels = [
  { icon: Users, nome: "Clientes", desc: "Base completa com filtros" },
  { icon: LogIn, nome: "Acessos", desc: "Frequência e horários" },
  { icon: Activity, nome: "Frequência", desc: "Presença mensal por cliente" },
  { icon: TrendingUp, nome: "Evolução", desc: "Ganhos e perdas por período" },
  { icon: ClipboardList, nome: "Avaliações", desc: "Histórico e comparativos" },
  { icon: ShoppingCart, nome: "Vendas", desc: "Por período, produto ou vendedor" },
  { icon: Package, nome: "Estoque", desc: "Posição e giro" },
  { icon: Package, nome: "Produtos", desc: "Mais vendidos e margens" },
  { icon: Wallet, nome: "Financeiro", desc: "Receita, custo e lucro" },
  { icon: Wallet, nome: "Contas a pagar", desc: "Compromissos futuros" },
  { icon: Wallet, nome: "Contas a receber", desc: "Recebimentos pendentes" },
  { icon: TrendingUp, nome: "Lucro", desc: "Margens por período" },
  { icon: UserX, nome: "Clientes inativos", desc: "Sem visitar há X dias" },
  { icon: Cake, nome: "Aniversariantes", desc: "Do mês e da semana" },
  { icon: AlertTriangle, nome: "Próx. vencimento", desc: "Produtos a vencer" },
];

function Relatorios() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Relatórios"
        description="Central de exportações com filtros e integração PDF/Excel."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rels.map((r) => (
          <Card key={r.nome} className="transition-shadow hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <r.icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{r.nome}</div>
                  <div className="text-xs text-muted-foreground">{r.desc}</div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" className="flex-1">
                  <FileText className="size-4" />
                  PDF
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  <FileSpreadsheet className="size-4" />
                  Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
