import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  ChefHat,
  FileText,
  Pencil,
  Phone,
  UserRoundPlus,
} from "lucide-react";
import { z } from "zod";
import { getClient, getClientPhotoUrl } from "@/services/clients";
import { listAssessments } from "@/services/assessments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientAssessmentSummary } from "@/components/assessments/ClientAssessmentSummary";
import { AssessmentCharts } from "@/components/assessments/AssessmentCharts";
import { AssessmentSummaryCards } from "@/components/assessments/AssessmentSummaryCards";
import { ExperiencePlansPanel } from "@/components/clients/ExperiencePlansPanel";
import { ClientReferralsPanel } from "@/components/clients/ClientReferralsPanel";
import { listClientConsumptions } from "@/services/operations";
import { RequirePermission } from "@/components/auth/RequirePermission";

const searchSchema = z.object({
  tab: z
    .enum(["overview", "evolution", "assessments", "consumption", "experience", "referrals"])
    .optional()
    .catch("overview"),
});

export const Route = createFileRoute("/_app/clientes/$id")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Perfil do cliente — Espaço+" }] }),
  component: ClientProfile,
});

function ClientProfile() {
  const { id } = Route.useParams();
  const { tab = "overview" } = Route.useSearch();
  const navigate = useNavigate();
  const client = useQuery({ queryKey: ["client", id], queryFn: () => getClient(id) });
  const photo = useQuery({
    queryKey: ["client-photo", client.data?.photo_url],
    queryFn: () => getClientPhotoUrl(client.data?.photo_url),
    enabled: Boolean(client.data?.photo_url),
  });
  const assessments = useQuery({
    queryKey: ["assessments", id],
    queryFn: () => listAssessments(id),
  });
  const consumptions = useQuery({
    queryKey: ["client-consumptions", id],
    queryFn: () => listClientConsumptions(id),
  });
  if (client.isLoading)
    return <p className="text-sm text-muted-foreground">Carregando perfil...</p>;
  if (!client.data) return <p className="text-sm text-destructive">Cliente não encontrado.</p>;
  const c = client.data;
  const history = assessments.data ?? [];
  const latest = history[0];
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
        <div className="flex flex-wrap gap-2">
          <RequirePermission permission="clients.update">
            <Button asChild variant="outline">
              <Link to="/clientes/editar/$id" params={{ id }}>
                <Pencil />
                Editar cadastro
              </Link>
            </Button>
          </RequirePermission>
          <RequirePermission permission="assessments.create">
            <Button asChild>
              <Link to="/avaliacoes/nova" search={{ clientId: id }}>
                <ClipboardList />
                Nova avaliação
              </Link>
            </Button>
          </RequirePermission>
        </div>
      </div>
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <Avatar className="size-20">
            <AvatarImage src={photo.data ?? undefined} alt={c.full_name} />
            <AvatarFallback>{c.full_name.charAt(0)}</AvatarFallback>
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
      <Tabs
        value={tab}
        onValueChange={(value) =>
          navigate({
            to: "/clientes/$id",
            params: { id },
            search: { tab: value as typeof tab },
            replace: true,
          })
        }
      >
        <TabsList className="h-auto w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="evolution">Evolução</TabsTrigger>
          <TabsTrigger value="assessments">Avaliações</TabsTrigger>
          <TabsTrigger value="consumption" className="gap-1">
            <ChefHat className="size-3.5" />
            Consumos
          </TabsTrigger>
          <TabsTrigger value="experience" className="gap-1">
            <CalendarDays className="size-3.5" />
            Experiência de 3 dias
          </TabsTrigger>
          <TabsTrigger value="referrals" className="gap-1">
            <UserRoundPlus className="size-3.5" />
            Indicações
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <ClientAssessmentSummary clientId={id} assessments={history} />
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Cadastro</CardTitle>
              </CardHeader>
              <CardContent>
                {new Date(`${c.registration_date}T12:00:00`).toLocaleDateString("pt-BR")}
              </CardContent>
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
              <CardContent>{history.length}</CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="evolution" className="space-y-5">
          {latest && <AssessmentSummaryCards assessment={latest} />}
          <AssessmentCharts assessments={history} />
        </TabsContent>
        <TabsContent value="assessments">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Avaliações</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {history.map((assessment) => (
                <article
                  key={assessment.id}
                  className="grid gap-3 py-4 sm:grid-cols-[120px_repeat(3,1fr)_auto] sm:items-center"
                >
                  <div>
                    <strong className="block text-lg">
                      {new Date(`${assessment.assessment_date}T12:00:00`).toLocaleDateString(
                        "pt-BR",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        },
                      )}
                    </strong>
                  </div>
                  <span className="text-sm">Peso: {assessment.weight ?? "—"} kg</span>
                  <span className="text-sm">IMC: {assessment.bmi ?? "—"}</span>
                  <span className="text-sm">Gordura: {assessment.body_fat_percentage ?? "—"}%</span>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/avaliacoes/$id" params={{ id: assessment.id }}>
                      <FileText />
                      Ver avaliação
                    </Link>
                  </Button>
                </article>
              ))}
              {!history.length && (
                <div className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">Nenhuma avaliação registrada.</p>
                  <Button className="mt-3" asChild>
                    <Link to="/avaliacoes/nova" search={{ clientId: id }}>
                      Iniciar primeira avaliação
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="consumption">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de consumo</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {consumptions.isLoading && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Carregando consumos...
                </p>
              )}
              {(consumptions.data ?? []).map((consumption) => (
                <article
                  key={consumption.id}
                  className="grid gap-3 py-4 md:grid-cols-[150px_1fr_auto] md:items-start"
                >
                  <div className="text-sm">
                    <strong className="block">
                      {new Date(
                        consumption.accesses?.accessed_at ?? consumption.created_at,
                      ).toLocaleDateString("pt-BR")}
                    </strong>
                    <span className="text-xs text-muted-foreground">
                      {new Date(
                        consumption.accesses?.accessed_at ?? consumption.created_at,
                      ).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">
                      {consumption.item_name_snapshot} ×{" "}
                      {consumption.quantity.toLocaleString("pt-BR")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {consumption.consumption_items
                        .map(
                          (item) =>
                            `${item.product_name_snapshot}: ${item.quantity.toLocaleString("pt-BR")} ${item.unit}`,
                        )
                        .join(" • ")}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <strong>{consumption.pv_total.toLocaleString("pt-BR")} PV</strong>
                    <p className="text-xs text-muted-foreground">
                      Custo:{" "}
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(consumption.cost_total)}
                    </p>
                  </div>
                </article>
              ))}
              {!consumptions.isLoading && !consumptions.data?.length && (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum consumo registrado para este cliente.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="experience">
          <ExperiencePlansPanel clientId={id} />
        </TabsContent>
        <TabsContent value="referrals">
          <ClientReferralsPanel clientId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
