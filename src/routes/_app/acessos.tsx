import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageChrome";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getClientPhotoUrls, listClients } from "@/services/clients";
import { listTodayAccesses, registerAccess } from "@/services/operations";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/acessos")({
  head: () => ({ meta: [{ title: "Registrar acesso — Espaço+" }] }),
  component: Accesses,
});
function Accesses() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("");
  const [service, setService] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const clients = useQuery({
    queryKey: ["access-clients", search],
    queryFn: () => listClients(search, 0, 10),
  });
  const accesses = useQuery({ queryKey: ["today-accesses"], queryFn: listTodayAccesses });
  const photoPaths = [
    ...(clients.data?.clients.map((client) => client.photo_url) ?? []),
    ...(accesses.data?.map((access) => access.clients?.photo_url ?? null) ?? []),
  ];
  const photos = useQuery({
    queryKey: ["access-client-photos", photoPaths],
    queryFn: () => getClientPhotoUrls(photoPaths),
    enabled: photoPaths.some(Boolean),
  });
  const current = clients.data?.clients.find((c) => c.id === selected);
  async function confirm() {
    if (!selected) return toast.error("Selecione um cliente.");
    setSaving(true);
    try {
      await registerAccess({
        client_id: selected,
        access_type: "visit",
        service_performed: service,
        notes,
      });
      toast.success(`Acesso registrado para ${current?.full_name}.`);
      setService("");
      setNotes("");
      await qc.invalidateQueries({ queryKey: ["today-accesses"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao registrar acesso.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="space-y-5">
      <PageHeader
        title="Registrar acesso"
        description="Fluxo rápido, seguro e otimizado para celular."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>1. Selecione o cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                placeholder="Buscar cliente..."
              />
            </div>
            {clients.data?.clients.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left ${selected === c.id ? "border-primary bg-primary-soft" : "border-transparent hover:bg-accent"}`}
              >
                <Avatar>
                  <AvatarImage
                    src={c.photo_url ? photos.data?.[c.photo_url] : undefined}
                    alt={c.full_name}
                  />
                  <AvatarFallback>{c.full_name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium">{c.full_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.primary_goal || "Sem objetivo"}
                  </div>
                </div>
                {selected === c.id && <Check className="size-4 text-primary" />}
              </button>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>2. Confirmar acesso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {current ? (
              <div className="rounded-xl bg-primary-soft p-4 font-semibold">
                {current.full_name}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Escolha um cliente ao lado.</p>
            )}
            <div>
              <Label className="mb-1.5 block">Serviço realizado</Label>
              <Input
                value={service}
                onChange={(e) => setService(e.target.value)}
                placeholder="Ex.: acompanhamento"
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Observações</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button size="lg" className="w-full" disabled={!selected || saving} onClick={confirm}>
              <Check />
              {saving ? "Registrando..." : "Confirmar acesso"}
            </Button>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Últimos acessos de hoje</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {accesses.data?.map((a) => (
            <div key={a.id} className="flex items-center gap-3 py-3">
              <Avatar>
                <AvatarImage
                  src={a.clients?.photo_url ? photos.data?.[a.clients.photo_url] : undefined}
                  alt={a.clients?.full_name || "Cliente"}
                />
                <AvatarFallback>{a.clients?.full_name?.[0] || "C"}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="font-medium">{a.clients?.full_name}</div>
                <div className="text-xs text-muted-foreground">
                  {a.service_performed || "Visita"}
                </div>
              </div>
              <Badge variant="outline">
                <Clock className="mr-1 size-3" />
                {new Date(a.accessed_at).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Badge>
            </div>
          ))}
          {!accesses.data?.length && (
            <p className="p-6 text-center text-sm text-muted-foreground">Nenhum acesso hoje.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
