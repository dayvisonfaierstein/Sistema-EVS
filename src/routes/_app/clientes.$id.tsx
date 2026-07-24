import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Phone } from "lucide-react";
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getClient } from "@/services/clients";
import { listAssessments } from "@/services/operations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_app/clientes/$id")({ component: ClientProfile });
function ClientProfile() {
  const { id } = Route.useParams();
  const client = useQuery({ queryKey: ["client", id], queryFn: () => getClient(id) });
  const assessments = useQuery({
    queryKey: ["assessments", id],
    queryFn: () => listAssessments(id),
  });
  if (client.isLoading)
    return <p className="text-sm text-muted-foreground">Carregando perfil...</p>;
  if (!client.data) return <p className="text-sm text-destructive">Cliente não encontrado.</p>;
  const c = client.data;
  const chart = [...(assessments.data ?? [])].reverse().map((a) => ({
    date: new Date(a.assessment_date).toLocaleDateString("pt-BR"),
    weight: a.weight,
    fat: a.body_fat_percentage,
    muscle: a.muscle_mass,
  }));
  async function pdf() {
    const pdfDocument = await PDFDocument.create();
    const page = pdfDocument.addPage([595, 842]);
    const regular = await pdfDocument.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDocument.embedFont(StandardFonts.HelveticaBold);
    page.drawText("Espaco+ | Relatorio individual", {
      x: 45,
      y: 790,
      size: 18,
      font: bold,
      color: rgb(0.1, 0.45, 0.3),
    });
    page.drawText(`Cliente: ${c.full_name}`, { x: 45, y: 760, size: 12, font: regular });
    page.drawText(`Objetivo: ${c.primary_goal || "Nao informado"}`, {
      x: 45,
      y: 742,
      size: 12,
      font: regular,
    });
    let y = 710;
    for (const a of (assessments.data ?? []).slice(0, 12)) {
      const line = `${new Date(a.assessment_date).toLocaleDateString("pt-BR")} | Peso: ${a.weight ?? "-"} kg | IMC: ${a.bmi ?? "-"} | Gordura: ${a.body_fat_percentage ?? "-"}%`;
      page.drawText(line, { x: 45, y, size: 10, font: regular });
      y -= 18;
    }
    page.drawText(`Emitido em ${new Date().toLocaleString("pt-BR")}`, {
      x: 45,
      y: 35,
      size: 9,
      font: regular,
    });
    const bytes = await pdfDocument.save();
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    const blob = new Blob([buffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `relatorio-${c.full_name.toLowerCase().replace(/\s+/g, "-")}.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/clientes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ArrowLeft className="size-4" />
          Clientes
        </Link>
        <Button variant="outline" onClick={pdf}>
          <Download />
          Relatório PDF
        </Button>
      </div>
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <Avatar className="size-20">
            <AvatarFallback>{c.full_name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{c.full_name}</h1>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <Phone className="size-3" />
              {c.phone || "Não informado"}
            </p>
            <div className="mt-2 flex gap-2">
              <Badge>
                {c.status === "active" ? "Ativo" : c.status === "new" ? "Novo" : "Inativo"}
              </Badge>
              <Badge variant="outline">{c.primary_goal || "Sem objetivo"}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="evolution">Evolução</TabsTrigger>
          <TabsTrigger value="assessments">Avaliações</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Cadastro</CardTitle>
              </CardHeader>
              <CardContent>{new Date(c.registration_date).toLocaleDateString("pt-BR")}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Última visita</CardTitle>
              </CardHeader>
              <CardContent>
                {c.last_visit_at
                  ? new Date(c.last_visit_at).toLocaleString("pt-BR")
                  : "Sem visitas"}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Avaliações</CardTitle>
              </CardHeader>
              <CardContent>{assessments.data?.length ?? 0}</CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="evolution">
          <Card>
            <CardHeader>
              <CardTitle>Evolução corporal</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              {chart.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      name="Peso"
                      stroke="hsl(var(--primary))"
                    />
                    <Line
                      type="monotone"
                      dataKey="fat"
                      name="Gordura %"
                      stroke="hsl(var(--destructive))"
                    />
                    <Line
                      type="monotone"
                      dataKey="muscle"
                      name="Massa muscular"
                      stroke="hsl(var(--success))"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="grid h-full place-items-center text-sm text-muted-foreground">
                  Cadastre avaliações para visualizar a evolução.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="assessments">
          <Card>
            <CardContent className="divide-y p-4">
              {(assessments.data ?? []).map((a) => (
                <div key={a.id} className="grid grid-cols-2 gap-2 py-3 text-sm sm:grid-cols-5">
                  <strong>{new Date(a.assessment_date).toLocaleDateString("pt-BR")}</strong>
                  <span>Peso: {a.weight ?? "—"} kg</span>
                  <span>IMC: {a.bmi ?? "—"}</span>
                  <span>Gordura: {a.body_fat_percentage ?? "—"}%</span>
                  <span>Músculo: {a.muscle_mass ?? "—"} kg</span>
                </div>
              ))}
              {!assessments.data?.length && (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  Nenhuma avaliação registrada.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
