import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AssessmentSummaryCards } from "@/components/assessments/AssessmentSummaryCards";
import { AssessmentComparison } from "@/components/assessments/AssessmentComparison";
import { AssessmentCharts } from "@/components/assessments/AssessmentCharts";
import { BodySilhouette } from "@/components/assessments/BodySilhouette";
import { classifyBMI } from "@/lib/body-assessment-references";
import { getAssessment, listAssessments } from "@/services/assessments";
import "@/components/assessments/assessment-report.css";

export const Route = createFileRoute("/_app/avaliacoes/$id")({
  head: () => ({ meta: [{ title: "Resultado da avaliação — Espaço+" }] }),
  component: AssessmentReportPage,
});

function AssessmentReportPage() {
  const { id } = Route.useParams();
  const assessment = useQuery({
    queryKey: ["assessment", id],
    queryFn: () => getAssessment(id),
  });
  const history = useQuery({
    queryKey: ["assessments", assessment.data?.client_id],
    queryFn: () => listAssessments(assessment.data!.client_id),
    enabled: Boolean(assessment.data?.client_id),
  });
  if (assessment.isLoading)
    return <p className="text-sm text-muted-foreground">Carregando avaliação...</p>;
  if (!assessment.data)
    return <p className="text-sm text-destructive">Avaliação não encontrada.</p>;
  const data = assessment.data;
  const currentIndex = history.data?.findIndex((item) => item.id === data.id) ?? -1;
  const previous = currentIndex >= 0 ? history.data?.[currentIndex + 1] : undefined;
  const bmiReference = classifyBMI(data.bmi);
  const bmiPosition =
    data.bmi == null ? 0 : Math.max(0, Math.min(100, ((data.bmi - 15) / 30) * 100));
  const measurements = [
    ["Cintura", data.waist],
    ["Abdômen", data.abdomen],
    ["Tórax / Busto", data.chest],
    ["Quadril", data.hip],
    ["Braço direito", data.right_arm],
    ["Braço esquerdo", data.left_arm],
    ["Coxa direita", data.right_thigh],
    ["Coxa esquerda", data.left_thigh],
  ];
  return (
    <div className="assessment-report mx-auto max-w-6xl space-y-6">
      <div className="assessment-report-actions flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" asChild>
          <Link to="/clientes/$id" params={{ id: data.client_id }}>
            <ArrowLeft />
            Voltar ao cliente
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer />
            Imprimir
          </Button>
          <Button onClick={() => window.print()}>
            <Download />
            Exportar PDF
          </Button>
        </div>
      </div>
      <header className="rounded-2xl bg-gradient-to-r from-emerald-900 to-emerald-700 p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.22em]">Espaço+</p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Avatar className="size-16 border-2 border-white/40">
            <AvatarFallback className="text-emerald-800">
              {data.clients.full_name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Avaliação Corporal</h1>
            <p>{data.clients.full_name}</p>
          </div>
          <div className="text-sm">
            <p>{new Date(`${data.assessment_date}T12:00:00`).toLocaleDateString("pt-BR")}</p>
            <p className="text-white/75">{data.evaluator_name || "Responsável não identificado"}</p>
          </div>
        </div>
      </header>
      <section>
        <h2 className="mb-3 text-xl font-bold">Resumo da sua avaliação</h2>
        <AssessmentSummaryCards assessment={data} />
      </section>
      <AssessmentComparison current={data} previous={previous} />
      <Card className="break-inside-avoid">
        <CardHeader>
          <CardTitle>Composição Corporal</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Gordura corporal", data.body_fat_percentage, "%"],
            ["Gordura subcutânea", data.subcutaneous_fat_percentage, "%"],
            ["Gordura visceral", data.visceral_fat, "nível"],
            ["Água corporal", data.body_water_percentage, "%"],
            ["Massa muscular", data.muscle_mass, "kg"],
            ["Taxa muscular", data.muscle_percentage, "%"],
            ["Massa muscular esquelética", data.skeletal_muscle_percentage, "%"],
            ["Massa óssea", data.bone_mass, "kg"],
            ["Proteína", data.protein_percentage, "%"],
            ["Massa livre de gordura", data.fat_free_mass, "kg"],
          ].map(([label, value, unit]) => (
            <div key={String(label)} className="rounded-xl border bg-muted/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <strong className="mt-2 block text-xl">
                {value ?? "—"} {value != null && unit}
              </strong>
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="break-inside-avoid">
          <CardHeader>
            <CardTitle>Índice de Massa Corporal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3">
              <strong className="text-4xl">{data.bmi ?? "—"}</strong>
              <span className="pb-1 font-semibold text-primary">{bmiReference?.label}</span>
            </div>
            <div className="relative mt-6">
              <div className="grid h-3 grid-cols-6 overflow-hidden rounded-full">
                <span className="bg-sky-300" />
                <span className="bg-emerald-400" />
                <span className="bg-amber-300" />
                <span className="bg-orange-300" />
                <span className="bg-orange-500" />
                <span className="bg-rose-500" />
              </div>
              {data.bmi != null && (
                <span
                  className="absolute top-[-5px] size-5 -translate-x-1/2 rounded-full border-4 border-white bg-slate-900 shadow"
                  style={{ left: `${bmiPosition}%` }}
                />
              )}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1 text-[10px] text-muted-foreground sm:grid-cols-6">
              {[
                "Baixo",
                "Adequado",
                "Sobrepeso",
                "Obesidade I",
                "Obesidade II",
                "Obesidade III",
              ].map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
            <p className="mt-5 text-xs text-muted-foreground">IMC = peso / altura²</p>
          </CardContent>
        </Card>
        <Card className="break-inside-avoid">
          <CardHeader>
            <CardTitle>Metabolismo e idade metabólica</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-muted p-4">
              <p className="text-sm text-muted-foreground">Metabolismo basal</p>
              <strong className="mt-2 block text-2xl">
                {data.basal_metabolic_rate ?? "—"} kcal/dia
              </strong>
              <p className="mt-2 text-xs text-muted-foreground">
                Estimativa da energia utilizada pelo organismo em repouso.
              </p>
            </div>
            <div className="rounded-xl bg-muted p-4">
              <p className="text-sm text-muted-foreground">Idade metabólica</p>
              <strong className="mt-2 block text-2xl">{data.metabolic_age ?? "—"} anos</strong>
              <p className="mt-2 text-xs text-muted-foreground">
                Idade cronológica na avaliação: {data.age_at_assessment ?? "—"} anos
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      <section className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <Card className="break-inside-avoid">
          <CardHeader>
            <CardTitle>Medidas corporais</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {measurements.map(([label, value]) => (
              <div
                key={String(label)}
                className="flex justify-between rounded-lg border p-3 text-sm"
              >
                <span className="text-muted-foreground">{label}</span>
                <strong>
                  {value ?? "—"} {value != null && "cm"}
                </strong>
              </div>
            ))}
          </CardContent>
        </Card>
        <BodySilhouette />
      </section>
      {(history.data?.length ?? 0) > 1 && <AssessmentCharts assessments={history.data ?? []} />}
      <footer className="border-t pt-4 text-center text-xs text-muted-foreground">
        Os indicadores apresentados têm finalidade de acompanhamento e não substituem avaliação,
        diagnóstico ou orientação de profissional de saúde habilitado.
      </footer>
    </div>
  );
}
