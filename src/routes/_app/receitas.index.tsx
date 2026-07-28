import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChefHat, Edit, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageChrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getRecipePhotoUrls, listRecipes, recipeTotals } from "@/services/recipes";

export const Route = createFileRoute("/_app/receitas/")({
  head: () => ({ meta: [{ title: "Receitas e preparações — Espaço+" }] }),
  component: RecipesPage,
});

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

function RecipesPage() {
  const [search, setSearch] = useState("");
  const recipes = useQuery({ queryKey: ["recipes"], queryFn: listRecipes });
  const photos = useQuery({
    queryKey: ["recipe-photos", recipes.data?.map((recipe) => recipe.photo_url)],
    queryFn: () => getRecipePhotoUrls((recipes.data ?? []).map((recipe) => recipe.photo_url)),
    enabled: Boolean(recipes.data?.some((recipe) => recipe.photo_url)),
  });
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    if (!query) return recipes.data ?? [];
    return (recipes.data ?? []).filter(
      (recipe) =>
        recipe.name.toLocaleLowerCase("pt-BR").includes(query) ||
        recipe.category?.toLocaleLowerCase("pt-BR").includes(query),
    );
  }, [recipes.data, search]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Receitas e preparações"
        description="Padronize os preparos e acompanhe custo, margem e Pontos de Volume."
        actions={
          <Button asChild>
            <Link to="/receitas/novo">
              <Plus />
              Nova preparação
            </Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome ou categoria..."
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {(recipes.isLoading || recipes.isError || filtered.length === 0) && (
        <Card>
          <CardContent className="grid min-h-48 place-items-center p-6 text-center text-muted-foreground">
            {recipes.isLoading
              ? "Carregando preparações..."
              : recipes.isError
                ? "Não foi possível carregar as preparações."
                : "Nenhuma preparação encontrada."}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((recipe) => {
          const totals = recipeTotals(recipe);
          const photoUrl = recipe.photo_url ? photos.data?.[recipe.photo_url] : null;
          return (
            <Card key={recipe.id} className="overflow-hidden">
              <div className="grid h-44 place-items-center overflow-hidden bg-primary-soft">
                {photoUrl ? (
                  <img src={photoUrl} alt={recipe.name} className="size-full object-cover" />
                ) : (
                  <ChefHat className="size-16 text-primary/35" />
                )}
              </div>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{recipe.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {recipe.category || "Sem categoria"} • {recipe.recipe_items.length}{" "}
                      ingrediente(s)
                    </p>
                  </div>
                  <Badge variant={recipe.active ? "default" : "outline"}>
                    {recipe.active ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Metric label="Preço" value={money.format(recipe.sale_price)} />
                  <Metric label="Custo" value={money.format(totals.cost)} />
                  <Metric label="PV" value={number.format(totals.pv)} />
                  <Metric label="Margem" value={`${number.format(totals.margin)}%`} />
                </div>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/receitas/editar/$id" params={{ id: recipe.id }}>
                    <Edit />
                    Ver e editar preparação
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
