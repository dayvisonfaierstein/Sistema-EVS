import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Assessment } from "@/types/database";

const periods = [
  ["30", "30 dias"],
  ["90", "90 dias"],
  ["180", "6 meses"],
  ["365", "1 ano"],
  ["all", "Todo período"],
] as const;

export function AssessmentCharts({ assessments }: { assessments: Assessment[] }) {
  const [period, setPeriod] = useState<(typeof periods)[number][0]>("all");
  const data = useMemo(() => {
    const cutoff =
      period === "all" ? null : new Date(Date.now() - Number(period) * 24 * 60 * 60 * 1000);
    return assessments
      .filter(
        (assessment) => !cutoff || new Date(`${assessment.assessment_date}T12:00:00`) >= cutoff,
      )
      .slice()
      .reverse()
      .map((assessment) => ({
        date: new Date(`${assessment.assessment_date}T12:00:00`).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "2-digit",
        }),
        weight: assessment.weight,
        bmi: assessment.bmi,
        fat: assessment.body_fat_percentage,
        muscle: assessment.muscle_mass,
        visceral: assessment.visceral_fat,
      }));
  }, [assessments, period]);
  const charts = [
    ["Peso", "weight", "kg", "#169b4b"],
    ["IMC", "bmi", "", "#2563eb"],
    ["Gordura corporal", "fat", "%", "#d97706"],
    ["Massa muscular", "muscle", "kg", "#059669"],
    ["Gordura visceral", "visceral", "", "#7c3aed"],
  ];
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Sua evolução</h2>
          <p className="text-sm text-muted-foreground">
            Histórico calculado com todas as avaliações registradas.
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {periods.map(([value, label]) => (
            <Button
              key={value}
              size="sm"
              variant={period === value ? "default" : "outline"}
              onClick={() => setPeriod(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {charts.map(([title, dataKey, unit, color]) => (
          <Card key={dataKey} className="break-inside-avoid">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{title}</CardTitle>
            </CardHeader>
            <CardContent className="h-56">
              {data.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" fontSize={11} />
                    <YAxis fontSize={11} unit={unit} width={52} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey={dataKey}
                      stroke={color}
                      strokeWidth={2.5}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="grid h-full place-items-center text-sm text-muted-foreground">
                  São necessárias duas avaliações no período.
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
