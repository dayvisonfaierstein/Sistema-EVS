import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageChrome";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listAdminOrganizations } from "@/services/platform-admin";
import type { OrganizationStatus } from "@/types/database";

export const Route = createFileRoute("/admin/organizacoes")({
  head: () => ({ meta: [{ title: "Organizações — Espaço+ Admin" }] }),
  component: OrganizationsPage,
});

const statusLabels: Record<OrganizationStatus, string> = {
  pending: "Pendente",
  trial: "Período de teste",
  active: "Ativa",
  grace_period: "Carência",
  blocked: "Bloqueada",
  cancelled: "Cancelada",
  inactive: "Inativa",
};

function OrganizationsPage() {
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["admin-organizations"],
    queryFn: listAdminOrganizations,
  });
  const organizations = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if (!term) return query.data ?? [];
    return (query.data ?? []).filter((organization) =>
      [
        organization.trade_name,
        organization.legal_name,
        organization.document,
        organization.city,
        organization.email,
      ].some((value) => value?.toLocaleLowerCase("pt-BR").includes(term)),
    );
  }, [query.data, search]);

  return (
    <div>
      <PageHeader
        title="Organizações"
        description="Todos os espaços cadastrados na plataforma e suas situações atuais."
      />
      <Card>
        <CardContent className="p-0">
          <div className="border-b p-4">
            <div className="relative max-w-lg">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por espaço, documento, cidade ou e-mail..."
                className="pl-9"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Organização</th>
                  <th className="px-4 py-3">Localização</th>
                  <th className="px-4 py-3">Contato</th>
                  <th className="px-4 py-3">Situação</th>
                  <th className="px-4 py-3">Cadastro</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {organizations.map((organization) => (
                  <tr key={organization.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                          <Building2 className="size-4" />
                        </div>
                        <div>
                          <div className="font-semibold">{organization.trade_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {organization.document || organization.legal_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {[organization.city, organization.state].filter(Boolean).join(" / ") || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div>{organization.email || "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {organization.whatsapp || organization.phone}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={organization.status === "active" ? "default" : "outline"}>
                        {statusLabels[organization.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(organization.created_at).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!query.isLoading && !organizations.length && (
            <p className="p-10 text-center text-sm text-muted-foreground">
              Nenhuma organização encontrada.
            </p>
          )}
          {query.isLoading && (
            <p className="p-10 text-center text-sm text-muted-foreground">
              Carregando organizações...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
