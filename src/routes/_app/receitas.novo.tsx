import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RecipeForm } from "@/components/recipes/RecipeForm";
import { PageHeader } from "@/components/layout/PageChrome";
import { saveRecipe, type RecipeInput } from "@/services/recipes";

export const Route = createFileRoute("/_app/receitas/novo")({
  head: () => ({ meta: [{ title: "Nova preparação — Espaço+" }] }),
  component: NewRecipePage,
});

function NewRecipePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const submit = async (input: RecipeInput, photo: File | null) => {
    try {
      const recipe = await saveRecipe(input, { photo });
      await queryClient.invalidateQueries({ queryKey: ["recipes"] });
      toast.success("Preparação cadastrada com sucesso.");
      await navigate({ to: "/receitas/editar/$id", params: { id: recipe.id } });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível cadastrar a preparação.",
      );
      throw error;
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Nova preparação"
        description="Cadastre os produtos e as quantidades utilizadas em cada preparo."
      />
      <RecipeForm submitLabel="Cadastrar preparação" onSubmit={submit} />
    </div>
  );
}
