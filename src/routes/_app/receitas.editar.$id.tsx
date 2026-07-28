import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { RecipeForm } from "@/components/recipes/RecipeForm";
import { PageHeader } from "@/components/layout/PageChrome";
import { getRecipe, getRecipePhotoUrls, saveRecipe, type RecipeInput } from "@/services/recipes";

export const Route = createFileRoute("/_app/receitas/editar/$id")({
  head: () => ({ meta: [{ title: "Editar preparação — Espaço+" }] }),
  component: EditRecipePage,
});

function EditRecipePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const recipe = useQuery({ queryKey: ["recipe", id], queryFn: () => getRecipe(id) });
  const photo = useQuery({
    queryKey: ["recipe-photo", recipe.data?.photo_url],
    queryFn: async () => {
      const urls = await getRecipePhotoUrls([recipe.data?.photo_url ?? null]);
      return recipe.data?.photo_url ? urls[recipe.data.photo_url] : null;
    },
    enabled: Boolean(recipe.data?.photo_url),
  });

  if (recipe.isLoading)
    return <p className="text-sm text-muted-foreground">Carregando preparação...</p>;
  if (!recipe.data) return <p className="text-sm text-destructive">Preparação não encontrada.</p>;

  const submit = async (
    input: RecipeInput,
    newPhoto: File | null,
    removeExistingPhoto: boolean,
  ) => {
    try {
      await saveRecipe(input, {
        id,
        photo: newPhoto,
        removePhoto: removeExistingPhoto,
        currentPhotoPath: recipe.data?.photo_url,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["recipe", id] }),
        queryClient.invalidateQueries({ queryKey: ["recipes"] }),
      ]);
      toast.success("Preparação atualizada com sucesso.");
      await navigate({ to: "/receitas" });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível atualizar a preparação.",
      );
      throw error;
    }
  };

  return (
    <div className="space-y-5">
      <Link to="/receitas" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" />
        Receitas e preparações
      </Link>
      <PageHeader
        title={`Editar ${recipe.data.name}`}
        description="Atualize ingredientes, quantidades, valores e foto."
      />
      <RecipeForm
        recipe={recipe.data}
        existingPhotoUrl={photo.data}
        submitLabel="Salvar alterações"
        onSubmit={submit}
      />
    </div>
  );
}
