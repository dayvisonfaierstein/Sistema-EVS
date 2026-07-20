import { createFileRoute } from "@tanstack/react-router";
import logoAsset from "../assets/aponti-logo.png.asset.json";
import {
  Bell,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  UserCheck,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

type NavItem = {
  label: string;
  icon: typeof LayoutDashboard;
  active?: boolean;
};

const navItems: NavItem[] = [
  { label: "Painel Geral", icon: LayoutDashboard, active: true },
  { label: "Alunos", icon: Users },
  { label: "Mensagens", icon: MessageSquare },
  { label: "Registro de Aula", icon: ClipboardList },
  { label: "Frequência", icon: UserCheck },
  { label: "Contas de Usuários", icon: Settings },
];

type Metric = {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger" | "accent";
};

const metrics: Metric[] = [
  { label: "Aulas Salvas", value: "128" },
  { label: "Alunos", value: "420" },
  { label: "Presenças", value: "8.429", tone: "success" },
  { label: "Faltas", value: "214", tone: "danger" },
  { label: "Frequência", value: "97,4%", tone: "accent" },
  { label: "Turmas", value: "12" },
];

type EventPill = { time: string; title: string; tone: "blue" | "indigo" | "dark" };
type Day = {
  n: number;
  muted?: boolean;
  today?: boolean;
  events?: EventPill[];
};

const days: Day[] = [
  { n: 28, muted: true },
  { n: 29, muted: true },
  { n: 30, muted: true },
  { n: 1, events: [{ time: "09:00", title: "Gamer I", tone: "blue" }] },
  { n: 2, events: [{ time: "14:00", title: "Robótica II", tone: "indigo" }] },
  { n: 3 },
  { n: 4 },
  { n: 5 },
  {
    n: 6,
    events: [
      { time: "09:00", title: "Gamer I", tone: "blue" },
      { time: "16:00", title: "Robótica I", tone: "indigo" },
    ],
  },
  { n: 7, today: true, events: [{ time: "Hoje", title: "Prova Robótica", tone: "dark" }] },
  { n: 8, events: [{ time: "09:00", title: "Gamer III", tone: "blue" }] },
  { n: 9 },
  { n: 10, events: [{ time: "14:00", title: "Robótica III", tone: "indigo" }] },
  { n: 11 },
  { n: 12 },
  { n: 13, events: [{ time: "09:00", title: "Gamer I", tone: "blue" }] },
  { n: 14 },
  { n: 15, events: [{ time: "14:00", title: "Robótica II", tone: "indigo" }] },
  { n: 16 },
  { n: 17 },
  { n: 18 },
  { n: 19 },
  { n: 20, events: [{ time: "09:00", title: "Gamer I", tone: "blue" }] },
  { n: 21 },
  { n: 22, events: [{ time: "14:00", title: "Robótica II", tone: "indigo" }] },
  { n: 23 },
  { n: 24 },
  { n: 25 },
  { n: 26 },
  { n: 27, events: [{ time: "09:00", title: "Gamer I", tone: "blue" }] },
  { n: 28 },
  { n: 29, events: [{ time: "14:00", title: "Robótica II", tone: "indigo" }] },
  { n: 30 },
  { n: 31 },
  { n: 1, muted: true },
];

const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function DashboardPage() {
  return (
    <div className="flex min-h-screen bg-[var(--color-brand-surface)] text-slate-900">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-72 shrink-0 bg-[var(--color-brand-primary)] text-white flex-col sticky top-0 h-screen">
        <div className="p-6 lg:p-8 pb-4">
          <div className="mb-8 lg:mb-10">
            <div className="flex items-center">
              <img
                src={logoAsset.url}
                alt="Aponti"
                className="h-9 lg:h-11 w-auto max-w-full"
              />
            </div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-3">
              Diário de Aula
            </p>
          </div>

          <div className="rounded-xl bg-white/[0.04] border border-white/5 p-4 mb-8">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-2">
              Projeto
            </p>
            <p className="text-sm font-semibold text-white leading-snug">
              Formação em Tecnologia
            </p>
            <p className="text-xs text-slate-400 mt-1">Instituto Shopping Guararapes</p>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.label}
                  href="#"
                  className={
                    item.active
                      ? "flex items-center gap-3 px-4 py-3 bg-[var(--color-brand-accent)]/10 text-[var(--color-brand-accent)] rounded-lg text-sm font-semibold"
                      : "flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg text-sm font-medium transition-colors"
                  }
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </a>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-6 pt-4">
          <a
            href="#"
            className="flex items-center gap-3 px-4 py-3 text-rose-400 hover:bg-rose-500/10 rounded-lg text-sm font-medium transition-colors"
          >
            <LogOut className="size-4 shrink-0" aria-hidden="true" />
            <span>Sair do Sistema</span>
          </a>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 p-6 sm:p-8 lg:p-10 overflow-y-auto">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 mb-8 lg:mb-10">
          <div className="min-w-0">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight truncate">
              Olá, Professor
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Acompanhe o desempenho das suas turmas hoje.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              className="size-10 rounded-full bg-white border border-slate-200 grid place-items-center text-slate-500 hover:text-slate-900 transition-colors"
              aria-label="Notificações"
            >
              <Bell className="size-4" aria-hidden="true" />
            </button>
            <div className="size-10 rounded-full bg-slate-900 text-white grid place-items-center text-xs font-bold">
              JD
            </div>
          </div>
        </header>

        {/* Metrics */}
        <section
          aria-label="Métricas gerais"
          className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-8 lg:mb-10"
        >
          {metrics.map((m) => (
            <div
              key={m.label}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                {m.label}
              </p>
              <p
                className={
                  "text-2xl font-bold tracking-tight " +
                  (m.tone === "success"
                    ? "text-[var(--color-brand-success)]"
                    : m.tone === "danger"
                      ? "text-rose-500"
                      : m.tone === "accent"
                        ? "text-[var(--color-brand-accent)]"
                        : "text-slate-900")
                }
              >
                {m.value}
              </p>
            </div>
          ))}
        </section>

        {/* Calendar */}
        <section className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-9 rounded-xl bg-[var(--color-brand-accent)]/10 text-[var(--color-brand-accent)] grid place-items-center shrink-0">
                <CalendarIcon className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-base sm:text-lg truncate">
                  Agenda de Atividades
                </h3>
                <p className="text-xs text-slate-500 truncate">Sincronizado com Google Agenda</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 text-sm font-medium shrink-0">
              <button
                type="button"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors"
              >
                Hoje
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Mês anterior"
                  className="size-9 grid place-items-center hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors"
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </button>
                <span className="px-3 text-sm font-semibold text-slate-900 min-w-[110px] text-center">
                  Julho 2026
                </span>
                <button
                  type="button"
                  aria-label="Próximo mês"
                  className="size-9 grid place-items-center hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors"
                >
                  <ChevronRight className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          {/* Weekday header */}
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/60">
            {weekdays.map((d) => (
              <div
                key={d}
                className="py-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 auto-rows-[110px] sm:auto-rows-[130px]">
            {days.map((day, i) => {
              const isLastCol = (i + 1) % 7 === 0;
              return (
                <div
                  key={i}
                  className={
                    "p-2 sm:p-3 border-b border-slate-100 group hover:bg-slate-50/60 transition-colors relative " +
                    (isLastCol ? "" : "border-r ") +
                    (day.today ? "bg-[var(--color-brand-accent)]/[0.04]" : "")
                  }
                >
                  {day.today ? (
                    <span className="inline-flex items-center justify-center size-7 rounded-full bg-[var(--color-brand-accent)] text-white text-xs font-bold">
                      {day.n}
                    </span>
                  ) : (
                    <span
                      className={
                        "text-sm font-semibold " +
                        (day.muted ? "text-slate-300" : "text-slate-700")
                      }
                    >
                      {String(day.n).padStart(2, "0")}
                    </span>
                  )}

                  {day.events && day.events.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {day.events.map((ev, j) => (
                        <div
                          key={j}
                          className={
                            "px-1.5 py-1 rounded text-[10px] font-bold uppercase leading-tight tracking-wide truncate " +
                            (ev.tone === "blue"
                              ? "bg-blue-100 text-blue-700"
                              : ev.tone === "indigo"
                                ? "bg-indigo-100 text-indigo-700"
                                : "bg-slate-900 text-white")
                          }
                          title={`${ev.time} · ${ev.title}`}
                        >
                          {ev.time} · {ev.title}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <footer className="mt-8 flex items-center gap-2 text-xs text-slate-400">
          <GraduationCap className="size-3.5" aria-hidden="true" />
          <span>Aponti · Diário de Aula Online</span>
        </footer>
      </main>
    </div>
  );
}
