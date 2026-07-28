import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  tone = "primary",
  trend,
  sparkline,
}: {
  title: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "primary" | "info" | "warning" | "destructive" | "success";
  trend?: { value: string; up?: boolean };
  sparkline?: number[];
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary-soft text-primary",
    info: "bg-[color:oklch(0.94_0.04_230)] text-info",
    warning: "bg-[color:oklch(0.96_0.06_75)] text-[color:var(--warning)]",
    destructive: "bg-[color:oklch(0.96_0.05_25)] text-destructive",
    success: "bg-primary-soft text-success",
  };
  const chart = sparkline?.length
    ? sparkline.map((point, index) => {
        const min = Math.min(...sparkline);
        const max = Math.max(...sparkline);
        const range = max - min || 1;
        return `${(index / Math.max(sparkline.length - 1, 1)) * 100},${28 - ((point - min) / range) * 24}`;
      })
    : [];
  return (
    <Card className="border-border/60 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {title}
            </div>
            <div className="mt-1 text-xl font-bold text-foreground sm:text-2xl">{value}</div>
            {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
            {trend && (
              <div
                className={cn(
                  "mt-2 text-xs font-medium",
                  trend.up ? "text-success" : "text-destructive",
                )}
              >
                {trend.up ? "▲" : "▼"} {trend.value}
              </div>
            )}
            {chart.length > 1 && (
              <svg
                aria-label={`Evolução recente de ${title}`}
                className={cn(
                  "mt-3 h-7 w-24 overflow-visible",
                  trend?.up === false ? "text-destructive" : "text-success",
                )}
                viewBox="0 0 100 32"
                preserveAspectRatio="none"
              >
                <polyline
                  fill="none"
                  points={chart.join(" ")}
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            )}
          </div>
          <div className={cn("grid size-11 shrink-0 place-items-center rounded-xl", tones[tone])}>
            <Icon className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
