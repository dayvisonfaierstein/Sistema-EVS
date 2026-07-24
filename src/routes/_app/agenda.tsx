import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/PageChrome";
import { agendamentos } from "@/lib/mockData";
import { PendingModuleBanner } from "@/components/layout/PendingModuleBanner";

export const Route = createFileRoute("/_app/agenda")({
  head: () => ({ meta: [{ title: "Agenda — Espaço+" }] }),
  component: Agenda,
});

const tipos = [
  { nome: "Avaliação", cor: "bg-primary text-primary-foreground" },
  { nome: "Reavaliação", cor: "bg-[color:var(--warning)] text-[color:var(--warning-foreground)]" },
  { nome: "Atendimento", cor: "bg-info text-info-foreground" },
  { nome: "Evento", cor: "bg-chart-4 text-white" },
  { nome: "Retorno", cor: "bg-chart-5 text-white" },
  { nome: "Reunião", cor: "bg-muted text-foreground" },
];

const horas = Array.from({ length: 12 }, (_, i) => `${7 + i}:00`);
const dias = ["Seg 21", "Ter 22", "Qua 23", "Qui 24", "Sex 25", "Sáb 26", "Dom 27"];

function tipoColor(t: string) {
  return tipos.find((x) => x.nome === t)?.cor ?? "bg-muted";
}

function Agenda() {
  const [view, setView] = useState("semanal");
  return (
    <div className="space-y-5">
      <PendingModuleBanner />
      <PageHeader
        title="Agenda"
        description="Organize atendimentos, avaliações e eventos."
        actions={
          <Button>
            <Plus />
            Novo agendamento
          </Button>
        }
      />

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon">
              <ChevronLeft className="size-4" />
            </Button>
            <div className="text-sm font-semibold">21 – 27 de julho, 2026</div>
            <Button variant="outline" size="icon">
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <Tabs value={view} onValueChange={setView}>
            <TabsList>
              <TabsTrigger value="diaria">Diária</TabsTrigger>
              <TabsTrigger value="semanal">Semanal</TabsTrigger>
              <TabsTrigger value="mensal">Mensal</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 pb-4">
            {tipos.map((t) => (
              <span
                key={t.nome}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${t.cor}`}
              >
                <span className="size-1.5 rounded-full bg-current" />
                {t.nome}
              </span>
            ))}
          </div>

          {view === "semanal" && (
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                <div className="grid grid-cols-[70px_repeat(7,1fr)] border-b text-xs font-semibold">
                  <div />
                  {dias.map((d) => (
                    <div key={d} className="p-2 text-center">
                      {d}
                    </div>
                  ))}
                </div>
                {horas.map((h, hi) => (
                  <div key={h} className="grid grid-cols-[70px_repeat(7,1fr)] border-b">
                    <div className="p-2 text-xs text-muted-foreground">{h}</div>
                    {dias.map((_, di) => {
                      const ag = agendamentos.find(
                        (a) =>
                          Number(a.hora.split(":")[0]) === 7 + hi &&
                          ((di === 3 && a.data === "24/07/2026") ||
                            (di === 4 && a.data === "25/07/2026")),
                      );
                      return (
                        <div key={di} className="min-h-14 border-l p-1">
                          {ag && (
                            <div
                              className={`rounded-md p-1.5 text-[11px] font-medium ${tipoColor(ag.tipo)}`}
                            >
                              <div className="truncate">{ag.cliente}</div>
                              <div className="opacity-90">{ag.tipo}</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === "diaria" && (
            <div className="space-y-2">
              {horas.map((h, i) => {
                const ags = agendamentos.filter((a) => Number(a.hora.split(":")[0]) === 7 + i);
                return (
                  <div key={h} className="flex gap-3 border-b py-2">
                    <div className="w-16 text-sm text-muted-foreground">{h}</div>
                    <div className="flex-1 space-y-1">
                      {ags.map((a) => (
                        <div key={a.id} className={`rounded-md p-2 text-sm ${tipoColor(a.tipo)}`}>
                          <div className="font-medium">
                            {a.cliente} <Badge className="ml-2 bg-white/25">{a.tipo}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {view === "mensal" && (
            <div className="grid grid-cols-7 gap-1 text-xs">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                <div key={d} className="p-2 text-center font-semibold text-muted-foreground">
                  {d}
                </div>
              ))}
              {Array.from({ length: 35 }).map((_, i) => {
                const dia = i - 2;
                return (
                  <div
                    key={i}
                    className={`min-h-20 rounded-md border p-1.5 ${dia < 1 || dia > 31 ? "bg-muted/30 text-muted-foreground" : ""}`}
                  >
                    <div className="text-[11px] font-semibold">
                      {dia > 0 && dia <= 31 ? dia : ""}
                    </div>
                    {[24, 25, 26].includes(dia) && (
                      <div className="mt-1 rounded bg-primary px-1 py-0.5 text-[10px] text-primary-foreground">
                        3 agend.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
