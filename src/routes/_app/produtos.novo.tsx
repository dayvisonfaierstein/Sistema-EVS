import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageChrome";
import {
  ProductForm,
  productFormValuesToInput,
  type ProductFormValues,
} from "@/components/products/ProductForm";
import { createProduct } from "@/services/products";

export const Route = createFileRoute("/_app/produtos/novo")({
  head: () => ({ meta: [{ title: "Novo produto — Espaço+" }] }),
  component: NewProductPage,
});

function NewProductPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  async function submit(values: ProductFormValues) {
    try {
      const product = await createProduct(productFormValuesToInput(values));
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produto cadastrado com sucesso.");
      await navigate({ to: "/produtos/$id", params: { id: product.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível cadastrar o produto.");
      throw error;
    }
  }
  return (
    <div className="space-y-5">
      <PageHeader
        title="Novo produto"
        description="Cadastre identificação, embalagem, unidades, preços e regras de controle."
      />
      <ProductForm submitLabel="Cadastrar produto" onSubmit={submit} />
    </div>
  );
}
