import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LayoutGrid, List, LogIn, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageChrome";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getClientPhotoUrls, listClients } from "@/services/clients";
import { isSupabaseConfigured } from "@/integrations/supabase/client";
import { RequirePermission } from "@/components/auth/RequirePermission";

export const Route = createFileRoute("/_app/clientes/")({
  head: () => ({ meta: [{ title: "Clientes — Espaço+" }] }),
  component: ClientesPage,
});
const statusLabel = { active: "Ativo", inactive: "Inativo", new: "Novo" };

function ClientesPage() {
  const configured = isSupabaseConfigured();
  const [view, setView] = useState<"table" | "cards">("table");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const query = useQuery({
    queryKey: ["clients", search, page],
    queryFn: () => listClients(search, page),
    enabled: configured,
  });
  const clients = query.data?.clients ?? [];
  const photoPaths = clients.map((client) => client.photo_url);
  const photos = useQuery({
    queryKey: ["client-photos", photoPaths],
    queryFn: () => getClientPhotoUrls(photoPaths),
    enabled: photoPaths.some(Boolean),
  });
  return (
    <div className="space-y-5">
      <PageHeader
        title="Clientes"
        description={
          configured
            ? `${query.data?.count ?? 0} clientes encontrados`
            : "Conecte o Supabase para visualizar dados reais"
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <RequirePermission permission="accesses.create">
              <Button asChild variant="outline">
                <Link to="/acessos">
                  <LogIn />
                  Registrar acesso
                </Link>
              </Button>
            </RequirePermission>
            <RequirePermission permission="clients.create">
              <Button asChild>
                <Link to="/clientes/novo">
                  <Plus />
                  Novo cliente
                </Link>
              </Button>
            </RequirePermission>
          </div>
        }
      />
      <Card>
        <CardContent className="flex gap-2 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Buscar por nome..."
              className="pl-9"
            />
          </div>
          <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
            <TabsList>
              <TabsTrigger value="table">
                <List className="size-4" />
              </TabsTrigger>
              <TabsTrigger value="cards">
                <LayoutGrid className="size-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>
      {query.isLoading && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Carregando clientes...
          </CardContent>
        </Card>
      )}
      {query.isError && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-destructive">
            Não foi possível carregar os clientes.
          </CardContent>
        </Card>
      )}
      {!query.isLoading && clients.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nenhum cliente encontrado.
          </CardContent>
        </Card>
      )}
      {clients.length > 0 && view === "table" && (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Objetivo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <Link
                        to="/clientes/$id"
                        params={{ id: client.id }}
                        className="flex items-center gap-3 font-medium hover:underline"
                      >
                        <Avatar className="size-9">
                          <AvatarImage
                            src={client.photo_url ? photos.data?.[client.photo_url] : undefined}
                            alt={client.full_name}
                          />
                          <AvatarFallback>{client.full_name[0]}</AvatarFallback>
                        </Avatar>
                        {client.full_name}
                      </Link>
                    </TableCell>
                    <TableCell>{client.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{client.primary_goal || "Não informado"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{statusLabel[client.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(client.registration_date).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
      {clients.length > 0 && view === "cards" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {clients.map((client) => (
            <Card key={client.id}>
              <CardContent className="p-5">
                <Avatar className="mb-3 size-14">
                  <AvatarImage
                    src={client.photo_url ? photos.data?.[client.photo_url] : undefined}
                    alt={client.full_name}
                  />
                  <AvatarFallback>{client.full_name[0]}</AvatarFallback>
                </Avatar>
                <div className="font-semibold">{client.full_name}</div>
                <div className="text-xs text-muted-foreground">
                  {client.phone || "Telefone não informado"}
                </div>
                <Button asChild size="sm" className="mt-4 w-full">
                  <Link to="/clientes/$id" params={{ id: client.id }}>
                    Abrir perfil
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {(query.data?.count ?? 0) > 20 && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <Button
            variant="outline"
            disabled={(page + 1) * 20 >= (query.data?.count ?? 0)}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}
