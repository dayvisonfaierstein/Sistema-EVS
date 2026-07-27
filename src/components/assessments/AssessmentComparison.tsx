import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { Assessment } from "@/types/database";

function Delta({
  label,
  current,
  previous,
  unit,
  lowerIsBetter,
}: {
  label: string;
  current: number | null;
  previous: number | null;
  unit: string;
  lowerIsBetter?: boolean;
}) {
  if (current == null || previous == null) return null;
  const delta = Math.round((current - previous) * 10) / 10;
  const improved = lowerIsBetter ? delta < 0 : delta > 0;
  const Icon = delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        <Icon className={improved ? "text-emerald-600" : delta === 0 ? "" : "text-amber-600"} />
        <strong className="text-xl">
          {delta > 0 ? "+" : ""}
          {delta.toLocaleString("pt-BR")} {unit}
        </strong>
      </div>
    </div>
  );
}

export function AssessmentComparison({
  current,
  previous,
}: {
  current: Assessment;
  previous?: Assessment;
}) {
  if (!previous) return null;
  return (
    <section>
      <div className="mb-3">
        <h3 className="font-semibold">Desde sua última avaliação</h3>
        <p className="text-sm text-muted-foreground">
          Comparação com{" "}
          {new Date(`${previous.assessment_date}T12:00:00`).toLocaleDateString("pt-BR")}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Delta
          label="Peso"
          current={current.weight}
          previous={previous.weight}
          unit="kg"
          lowerIsBetter
        />
        <Delta
          label="Gordura"
          current={current.body_fat_percentage}
          previous={previous.body_fat_percentage}
          unit="p.p."
          lowerIsBetter
        />
        <Delta
          label="Músculo"
          current={current.muscle_mass}
          previous={previous.muscle_mass}
          unit="kg"
        />
        <Delta
          label="Cintura"
          current={current.waist}
          previous={previous.waist}
          unit="cm"
          lowerIsBetter
        />
      </div>
    </section>
  );
}
