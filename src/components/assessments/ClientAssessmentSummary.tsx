import { Link } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight, ClipboardPlus, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Assessment } from "@/types/database";

function EvolutionValue({
  label,
  value,
  delta,
  unit,
  lowerIsBetter,
}: {
  label: string;
  value: number | null;
  delta?: number | null;
  unit: string;
  lowerIsBetter?: boolean;
}) {
  const improved = delta != null && (lowerIsBetter ? delta < 0 : delta > 0);
  const Icon = delta != null && delta > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="flex items-center justify-between gap-3 border-b py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-right">
        <strong>
          {value ?? "—"} {value != null && unit}
        </strong>
        {delta != null && delta !== 0 && (
          <span
            className={`ml-2 inline-flex items-center text-xs ${improved ? "text-emerald-600" : "text-amber-600"}`}
          >
            <Icon className="size-3" />
            {delta > 0 ? "+" : ""}
            {delta.toLocaleString("pt-BR")} {unit === "%" ? "p.p." : unit}
          </span>
        )}
      </div>
    </div>
  );
}

export function ClientAssessmentSummary({
  clientId,
  assessments,
}: {
  clientId: string;
  assessments: Assessment[];
}) {
  const latest = assessments[0];
  const previous = assessments[1];
  const delta = (key: keyof Assessment) => {
    const current = latest?.[key];
    const prior = previous?.[key];
    return typeof current === "number" && typeof prior === "number"
      ? Math.round((current - prior) * 10) / 10
      : null;
  };
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Evolução corporal</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {latest
              ? `Última avaliação em ${new Date(`${latest.assessment_date}T12:00:00`).toLocaleDateString("pt-BR")}`
              : "Nenhuma avaliação realizada"}
          </p>
        </div>
        <TrendingUp className="size-6 text-primary" />
      </CardHeader>
      <CardContent>
        {latest ? (
          <div>
            <EvolutionValue
              label="Peso"
              value={latest.weight}
              delta={delta("weight")}
              unit="kg"
              lowerIsBetter
            />
            <EvolutionValue
              label="Gordura"
              value={latest.body_fat_percentage}
              delta={delta("body_fat_percentage")}
              unit="%"
              lowerIsBetter
            />
            <EvolutionValue
              label="Músculo"
              value={latest.muscle_mass}
              delta={delta("muscle_mass")}
              unit="kg"
            />
            <EvolutionValue
              label="Cintura"
              value={latest.waist}
              delta={delta("waist")}
              unit="cm"
              lowerIsBetter
            />
          </div>
        ) : (
          <p className="py-5 text-sm text-muted-foreground">
            Inicie a primeira avaliação para acompanhar a evolução deste cliente.
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/avaliacoes/nova" search={{ clientId }}>
              <ClipboardPlus />
              {latest ? "Nova avaliação" : "Iniciar primeira avaliação"}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/clientes/$id" params={{ id: clientId }} search={{ tab: "evolution" }}>
              Ver evolução completa
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
