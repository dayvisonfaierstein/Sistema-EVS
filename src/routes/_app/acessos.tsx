import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChefHat, Clock, Package, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageChrome";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getClientPhotoUrls, listClients } from "@/services/clients";
import { getProductPhotoUrls, listProducts } from "@/services/products";
import { getRecipePhotoUrls, listRecipes } from "@/services/recipes";
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
  const [consumptionType, setConsumptionType] = useState<"none" | "recipe" | "product">("none");
  const [consumptionId, setConsumptionId] = useState("");
  const [consumptionQuantity, setConsumptionQuantity] = useState(1);
  const [consumptionSearch, setConsumptionSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const clients = useQuery({
    queryKey: ["access-clients", search],
    queryFn: () => listClients(search, 0, 10),
  });
  const accesses = useQuery({ queryKey: ["today-accesses"], queryFn: listTodayAccesses });
  const recipes = useQuery({ queryKey: ["recipes"], queryFn: listRecipes });
  const products = useQuery({
    queryKey: ["products", { active: "active" }],
    queryFn: () => listProducts({ active: "active" }),
  });
  const photoPaths = [
    ...(clients.data?.clients.map((client) => client.photo_url) ?? []),
    ...(accesses.data?.map((access) => access.clients?.photo_url ?? null) ?? []),
  ];
  const photos = useQuery({
    queryKey: ["access-client-photos", photoPaths],
    queryFn: () => getClientPhotoUrls(photoPaths),
    enabled: photoPaths.some(Boolean),
  });
  const recipePhotos = useQuery({
    queryKey: ["access-recipe-photos", recipes.data?.map((recipe) => recipe.photo_url)],
    queryFn: () => getRecipePhotoUrls((recipes.data ?? []).map((recipe) => recipe.photo_url)),
    enabled: Boolean(recipes.data?.some((recipe) => recipe.photo_url)),
  });
  const productPhotos = useQuery({
    queryKey: ["access-product-photos", products.data?.map((product) => product.photo_url)],
    queryFn: () => getProductPhotoUrls((products.data ?? []).map((product) => product.photo_url)),
    enabled: Boolean(products.data?.some((product) => product.photo_url)),
  });
  const current = clients.data?.clients.find((c) => c.id === selected);
  const consumptionOptions =
    consumptionType === "recipe"
      ? (recipes.data ?? []).filter((recipe) => recipe.active)
      : consumptionType === "product"
        ? (products.data ?? [])
        : [];
  const filteredConsumptionOptions = consumptionOptions.filter((item) =>
    item.name.toLocaleLowerCase("pt-BR").includes(consumptionSearch.toLocaleLowerCase("pt-BR")),
  );
  const selectedConsumption = consumptionOptions.find((item) => item.id === consumptionId);
  async function confirm() {
    if (!selected) return toast.error("Selecione um cliente.");
    if (consumptionType !== "none" && !consumptionId)
      return toast.error("Selecione o consumo realizado.");
    if (
      consumptionType !== "none" &&
      (!Number.isFinite(consumptionQuantity) || consumptionQuantity <= 0)
    )
      return toast.error("Informe uma quantidade válida.");
    setSaving(true);
    try {
      await registerAccess({
        client_id: selected,
        access_type: "visit",
        service_performed: service,
        notes,
        consumption_type: consumptionType,
        item_id: consumptionId || null,
        quantity: consumptionQuantity,
      });
      toast.success(`Acesso registrado para ${current?.full_name}.`);
      setService("");
      setNotes("");
      setConsumptionType("none");
      setConsumptionId("");
      setConsumptionQuantity(1);
      setConsumptionSearch("");
      await qc.invalidateQueries({ queryKey: ["today-accesses"] });
      await qc.invalidateQueries({ queryKey: ["products"] });
      await qc.invalidateQueries({ queryKey: ["inventory-movements"] });
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
            <div className="space-y-3 rounded-xl border p-4">
              <div>
                <Label className="mb-2 block">Consumo realizado</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ["none", "Sem consumo"],
                      ["recipe", "Preparação"],
                      ["product", "Produto avulso"],
                    ] as const
                  ).map(([value, label]) => (
                    <Button
                      key={value}
                      type="button"
                      size="sm"
                      variant={consumptionType === value ? "default" : "outline"}
                      onClick={() => {
                        setConsumptionType(value);
                        setConsumptionId("");
                        setConsumptionQuantity(1);
                        setConsumptionSearch("");
                      }}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {consumptionType !== "none" && (
                <>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={consumptionSearch}
                      onChange={(event) => setConsumptionSearch(event.target.value)}
                      placeholder={
                        consumptionType === "recipe" ? "Buscar preparação..." : "Buscar produto..."
                      }
                      className="pl-9"
                    />
                  </div>
                  <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                    {filteredConsumptionOptions.map((item) => {
                      const imagePath = item.photo_url;
                      const imageUrl =
                        consumptionType === "recipe"
                          ? imagePath
                            ? recipePhotos.data?.[imagePath]
                            : undefined
                          : imagePath
                            ? productPhotos.data?.[imagePath]
                            : undefined;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setConsumptionId(item.id)}
                          className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left ${
                            consumptionId === item.id
                              ? "border-primary bg-primary-soft"
                              : "hover:bg-accent"
                          }`}
                        >
                          <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-primary-soft text-primary">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={item.name}
                                className="size-full object-cover"
                              />
                            ) : consumptionType === "recipe" ? (
                              <ChefHat className="size-5" />
                            ) : (
                              <Package className="size-5" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">{item.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {consumptionType === "recipe"
                                ? "Preparação"
                                : "current_stock" in item
                                  ? `${item.current_stock.toLocaleString("pt-BR")} ${item.consumption_unit} disponível`
                                  : "Produto"}
                            </div>
                          </div>
                          {consumptionId === item.id && <Check className="size-4 text-primary" />}
                        </button>
                      );
                    })}
                    {!filteredConsumptionOptions.length && (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        Nenhuma opção encontrada.
                      </p>
                    )}
                  </div>
                  {selectedConsumption && (
                    <div className="grid grid-cols-[1fr_120px] items-end gap-3 rounded-lg bg-muted/40 p-3">
                      <div>
                        <div className="text-xs text-muted-foreground">Selecionado</div>
                        <div className="font-medium">{selectedConsumption.name}</div>
                      </div>
                      <div>
                        <Label className="mb-1 block text-xs">
                          {consumptionType === "recipe"
                            ? "Porções"
                            : "consumption_unit" in selectedConsumption
                              ? `Quantidade (${selectedConsumption.consumption_unit})`
                              : "Quantidade"}
                        </Label>
                        <Input
                          type="number"
                          min="0.000001"
                          step="any"
                          value={consumptionQuantity}
                          onChange={(event) => setConsumptionQuantity(Number(event.target.value))}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
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
                {a.access_consumptions?.map((consumption) => (
                  <div key={consumption.id} className="mt-1 text-xs font-medium text-primary">
                    {consumption.item_name_snapshot} ×{" "}
                    {consumption.quantity.toLocaleString("pt-BR")}
                  </div>
                ))}
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
