import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, FileText, Plus, Search, UsersRound } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageChrome";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { listAssessments } from "@/services/assessments";
import { getClientPhotoUrls, listClients } from "@/services/clients";
import { RequirePermission } from "@/components/auth/RequirePermission";

export const Route = createFileRoute("/_app/avaliacoes/")({
  head: () => ({ meta: [{ title: "Avaliações corporais — Espaço+" }] }),
  component: AssessmentsPage,
});

function AssessmentsPage() {
  const [search, setSearch] = useState("");
  const assessments = useQuery({ queryKey: ["assessments"], queryFn: () => listAssessments() });
  const clients = useQuery({
    queryKey: ["assessment-clients", search],
    queryFn: () => listClients(search, 0, 30),
  });
  const allClients = useQuery({
    queryKey: ["assessment-client-map"],
    queryFn: () => listClients("", 0, 500),
  });
  const allClientItems = allClients.data?.clients ?? [];
  const clientMap = new Map(allClientItems.map((client) => [client.id, client]));
  const photoPaths = allClientItems.map((client) => client.photo_url);
  const photos = useQuery({
    queryKey: ["assessment-client-photos", photoPaths],
    queryFn: () => getClientPhotoUrls(photoPaths),
    enabled: photoPaths.some(Boolean),
  });
  return (
    <div className="space-y-5">
      <PageHeader
        title="Avaliações Corporais"
        description="Acompanhe bioimpedância, medidas e evolução dos clientes ao longo do tempo."
        actions={
          <RequirePermission permission="assessments.create">
            <Button asChild>
              <Link to="/avaliacoes/nova">
                <Plus />
                Nova avaliação
              </Link>
            </Button>
          </RequirePermission>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersRound className="size-5 text-primary" />
              Iniciar pelo cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar cliente"
                className="pl-9"
              />
            </div>
            <div className="max-h-[520px] divide-y overflow-y-auto">
              {clients.data?.clients.map((client) => {
                const latest = assessments.data?.find((item) => item.client_id === client.id);
                return (
                  <div key={client.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="size-10 shrink-0">
                        <AvatarImage
                          src={client.photo_url ? photos.data?.[client.photo_url] : undefined}
                          alt={client.full_name}
                        />
                        <AvatarFallback>{client.full_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <Link
                          to="/clientes/$id"
                          params={{ id: client.id }}
                          className="block truncate font-medium hover:text-primary"
                        >
                          {client.full_name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {latest
                            ? `Última: ${new Date(`${latest.assessment_date}T12:00:00`).toLocaleDateString("pt-BR")}`
                            : "Sem avaliação"}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant={latest ? "outline" : "default"} asChild>
                      <Link to="/avaliacoes/nova" search={{ clientId: client.id }}>
                        {latest ? "Reavaliar" : "Iniciar"}
                      </Link>
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="size-5 text-primary" />
              Histórico recente
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {assessments.data?.slice(0, 30).map((assessment) => (
              <article
                key={assessment.id}
                className="grid gap-3 py-4 sm:grid-cols-[1fr_repeat(3,auto)_auto] sm:items-center"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="size-10 shrink-0">
                    <AvatarImage
                      src={
                        clientMap.get(assessment.client_id)?.photo_url
                          ? photos.data?.[clientMap.get(assessment.client_id)!.photo_url!]
                          : undefined
                      }
                      alt={clientMap.get(assessment.client_id)?.full_name || "Cliente"}
                    />
                    <AvatarFallback>
                      {clientMap.get(assessment.client_id)?.full_name?.charAt(0) || "C"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <strong>{clientMap.get(assessment.client_id)?.full_name || "Cliente"}</strong>
                    <p className="text-xs text-muted-foreground">
                      {new Date(`${assessment.assessment_date}T12:00:00`).toLocaleDateString(
                        "pt-BR",
                      )}
                    </p>
                  </div>
                </div>
                <span className="text-sm">{assessment.weight ?? "—"} kg</span>
                <span className="text-sm">IMC {assessment.bmi ?? "—"}</span>
                <span className="text-sm">{assessment.body_fat_percentage ?? "—"}% gordura</span>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/avaliacoes/$id" params={{ id: assessment.id }}>
                    <FileText />
                    Ver
                  </Link>
                </Button>
              </article>
            ))}
            {!assessments.data?.length && (
              <div className="grid place-items-center gap-2 py-14 text-center">
                <ClipboardList className="size-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Nenhuma avaliação registrada.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
