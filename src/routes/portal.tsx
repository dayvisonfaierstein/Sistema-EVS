import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Leaf,
  TrendingDown,
  Target,
  Activity,
  Calendar,
  PartyPopper,
  Bell,
  User,
  Sparkles,
  LogOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { evolucaoCliente } from "@/lib/mockData";

export const Route = createFileRoute("/portal")({
  head: () => ({ meta: [{ title: "Portal do cliente — Espaço+" }] }),
  component: Portal,
});

const composicao = [
  { data: "Fev", gordura: 32, musculo: 28 },
  { data: "Mar", gordura: 30.5, musculo: 28.8 },
  { data: "Abr", gordura: 29.1, musculo: 29.4 },
  { data: "Mai", gordura: 27.8, musculo: 30.1 },
  { data: "Jun", gordura: 26.4, musculo: 30.7 },
  { data: "Jul", gordura: 25.2, musculo: 31.2 },
];

function Portal() {
  const pesoInicial = 82;
  const pesoAtual = 74.5;
  const meta = 70;
  const progresso = ((pesoInicial - pesoAtual) / (pesoInicial - meta)) * 100;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Leaf className="size-5" />
          </div>
          <div>
            <div className="text-sm font-bold leading-tight">Espaço+</div>
            <div className="text-[11px] text-muted-foreground">Portal do cliente</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Bell className="size-5" />
            </Button>
            <Avatar className="size-9">
              <AvatarImage src="https://i.pravatar.cc/100?img=5" />
              <AvatarFallback>AB</AvatarFallback>
            </Avatar>
            <Button asChild variant="ghost" size="icon">
              <Link to="/login">
                <LogOut className="size-5" />
              </Link>
            </Button>
          </div>
        </div>
        <nav className="mx-auto max-w-6xl overflow-x-auto px-4">
          <div className="flex gap-1 pb-2">
            {[
              "Início",
              "Minha evolução",
              "Avaliações",
              "Minhas visitas",
              "Minhas compras",
              "Agenda",
              "Eventos",
              "Notificações",
              "Meu perfil",
            ].map((m, i) => (
              <button
                key={m}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${i === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
              >
                {m}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        <Card className="overflow-hidden bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
          <CardContent className="flex flex-wrap items-center gap-5 p-6">
            <Avatar className="size-20 ring-4 ring-white/30">
              <AvatarImage src="https://i.pravatar.cc/100?img=5" />
              <AvatarFallback>AB</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-sm opacity-90">Bem-vinda de volta,</div>
              <div className="text-2xl font-bold sm:text-3xl">Ana Beatriz! ✨</div>
              <div className="mt-1 flex items-center gap-2 text-sm opacity-90">
                <Sparkles className="size-4" /> Você já perdeu{" "}
                {(pesoInicial - pesoAtual).toFixed(1)} kg desde o início. Continue firme!
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-xs opacity-80">Peso inicial</div>
                <div className="text-lg font-bold">{pesoInicial} kg</div>
              </div>
              <div>
                <div className="text-xs opacity-80">Atual</div>
                <div className="text-lg font-bold">{pesoAtual} kg</div>
              </div>
              <div>
                <div className="text-xs opacity-80">Meta</div>
                <div className="text-lg font-bold">{meta} kg</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold flex items-center gap-2">
                <Target className="size-4 text-primary" />
                Progresso da minha meta
              </span>
              <span className="text-muted-foreground">{progresso.toFixed(0)}%</span>
            </div>
            <Progress value={progresso} className="h-3" />
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>{pesoInicial} kg</span>
              <span>{meta} kg</span>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3">
          <MiniCard
            icon={TrendingDown}
            label="Evolução"
            value={`- ${(pesoInicial - pesoAtual).toFixed(1)} kg`}
            sub="desde fev/2026"
          />
          <MiniCard
            icon={Activity}
            label="Frequência este mês"
            value="18 visitas"
            sub="média de 4/semana"
          />
          <MiniCard
            icon={Calendar}
            label="Próxima avaliação"
            value="10/08/2026"
            sub="14:00 com Paula"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Meu peso</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolucaoCliente}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="data" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="peso"
                    stroke="var(--chart-1)"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Composição corporal</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={composicao}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="data" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                  />
                  <Bar
                    dataKey="musculo"
                    fill="var(--chart-1)"
                    name="Músculo"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="gordura"
                    fill="var(--chart-4)"
                    name="Gordura"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PartyPopper className="size-4 text-primary" />
                Próximo evento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-primary-soft p-4">
                <div className="text-base font-semibold">Aulão de Zumba 💃</div>
                <div className="text-sm text-muted-foreground">
                  Sábado, 26/07 · 08:00 · Espaço Central
                </div>
                <Button size="sm" className="mt-3">
                  Confirmar presença
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico recente de visitas</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {[
                { data: "23/07", servico: "Consumo Shake", atendente: "Paula" },
                { data: "21/07", servico: "Avaliação", atendente: "Ricardo" },
                { data: "18/07", servico: "Retirada produto", atendente: "Beatriz" },
                { data: "15/07", servico: "Consumo Shake", atendente: "Paula" },
              ].map((v, i) => (
                <div key={i} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <div className="font-medium">{v.servico}</div>
                    <div className="text-xs text-muted-foreground">com {v.atendente}</div>
                  </div>
                  <Badge variant="outline">{v.data}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function MiniCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="font-bold">{value}</div>
          <div className="text-[11px] text-muted-foreground">{sub}</div>
        </div>
      </CardContent>
    </Card>
  );
}
