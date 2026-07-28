import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileClock, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageChrome";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listAdminAuditLogs } from "@/services/platform-admin";

export const Route = createFileRoute("/admin/auditoria")({
  head: () => ({ meta: [{ title: "Auditoria global — Espaço+ Admin" }] }),
  component: AuditPage,
});

function AuditPage() {
  const [search, setSearch] = useState("");
  const query = useQuery({ queryKey: ["admin-audit"], queryFn: listAdminAuditLogs });
  const logs = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if (!term) return query.data ?? [];
    return (query.data ?? []).filter((log) =>
      [
        log.action,
        log.entity,
        log.organization_id,
        log.user_id,
        log.organization?.trade_name,
        log.user?.full_name,
        log.user?.email,
      ].some((value) => value?.toLocaleLowerCase("pt-BR").includes(term)),
    );
  }, [query.data, search]);

  return (
    <div>
      <PageHeader
        title="Auditoria global"
        description="Últimas 250 alterações relevantes registradas em toda a plataforma."
      />
      <Card>
        <CardContent className="p-0">
          <div className="border-b p-4">
            <div className="relative max-w-lg">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por ação, entidade, usuário ou organização..."
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Data e hora</th>
                  <th className="px-4 py-3">Ação</th>
                  <th className="px-4 py-3">Entidade</th>
                  <th className="px-4 py-3">Organização</th>
                  <th className="px-4 py-3">Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/20">
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {new Date(log.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{log.action}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileClock className="size-4 text-primary" />
                        <span>{log.entity}</span>
                      </div>
                    </td>
                    <td className="max-w-44 truncate px-4 py-3 text-xs text-muted-foreground">
                      {log.organization?.trade_name || "Plataforma"}
                    </td>
                    <td className="max-w-44 truncate px-4 py-3 text-xs text-muted-foreground">
                      {log.user?.full_name || log.user?.email || "Sistema"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!query.isLoading && !logs.length && (
            <p className="p-10 text-center text-sm text-muted-foreground">
              Nenhum registro de auditoria encontrado.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
