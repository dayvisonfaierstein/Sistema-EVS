import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageChrome";
import {
  ProductForm,
  productFormValuesToInput,
  type ProductFormValues,
} from "@/components/products/ProductForm";
import { getProduct, getProductPhotoUrl, updateProduct } from "@/services/products";

export const Route = createFileRoute("/_app/produtos/editar/$id")({
  head: () => ({ meta: [{ title: "Editar produto — Espaço+" }] }),
  component: EditProductPage,
});

function EditProductPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const product = useQuery({ queryKey: ["product", id], queryFn: () => getProduct(id) });
  const photo = useQuery({
    queryKey: ["product-photo", product.data?.photo_url],
    queryFn: () => getProductPhotoUrl(product.data?.photo_url),
    enabled: Boolean(product.data?.photo_url),
  });
  if (product.isLoading)
    return <p className="text-sm text-muted-foreground">Carregando produto...</p>;
  if (!product.data) return <p className="text-sm text-destructive">Produto não encontrado.</p>;

  async function submit(
    values: ProductFormValues,
    newPhoto: File | null,
    removeExistingPhoto: boolean,
  ) {
    try {
      await updateProduct(id, productFormValuesToInput(values), {
        photo: newPhoto,
        removePhoto: removeExistingPhoto,
        currentPhotoPath: product.data?.photo_url,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["product", id] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
      ]);
      toast.success("Produto atualizado com sucesso.");
      await navigate({ to: "/produtos/$id", params: { id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o produto.");
      throw error;
    }
  }
  return (
    <div className="space-y-5">
      <Link
        to="/produtos/$id"
        params={{ id }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" />
        Voltar ao produto
      </Link>
      <PageHeader
        title={`Editar ${product.data.name}`}
        description="Atualize o cadastro sem alterar o saldo atual do estoque."
      />
      <ProductForm
        product={product.data}
        existingPhotoUrl={photo.data}
        submitLabel="Salvar alterações"
        onSubmit={submit}
      />
    </div>
  );
}
