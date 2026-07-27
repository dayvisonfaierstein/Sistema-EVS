import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { ClientForm, type ClientFormValues } from "@/components/clients/ClientForm";
import { PageHeader } from "@/components/layout/PageChrome";
import { getClient, getClientPhotoUrl, updateClient } from "@/services/clients";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/clientes/editar/$id")({
  head: () => ({ meta: [{ title: "Editar cliente — Espaço+" }] }),
  component: EditClient,
});

function EditClient() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const client = useQuery({ queryKey: ["client", id], queryFn: () => getClient(id) });
  const photo = useQuery({
    queryKey: ["client-photo", client.data?.photo_url],
    queryFn: () => getClientPhotoUrl(client.data?.photo_url),
    enabled: Boolean(client.data?.photo_url),
  });

  if (client.isLoading)
    return <p className="text-sm text-muted-foreground">Carregando cadastro...</p>;
  if (!client.data) return <p className="text-sm text-destructive">Cliente não encontrado.</p>;

  const current = client.data;

  async function submit(
    values: ClientFormValues,
    newPhoto: File | null,
    removeExistingPhoto: boolean,
  ) {
    try {
      await updateClient(
        id,
        {
          ...values,
          cpf: values.cpf || null,
          phone: values.phone || null,
          whatsapp: values.whatsapp || null,
          email: values.email || null,
          primary_goal: values.primary_goal || null,
          notes: values.notes || null,
        },
        {
          photo: newPhoto,
          removePhoto: removeExistingPhoto,
          currentPhotoPath: current.photo_url,
        },
      );
      await queryClient.invalidateQueries({ queryKey: ["client", id] });
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cadastro atualizado com sucesso.");
      await navigate({ to: "/clientes/$id", params: { id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao atualizar o cliente.");
      throw error;
    }
  }

  return (
    <div className="space-y-5">
      <Link
        to="/clientes/$id"
        params={{ id }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Voltar ao perfil
      </Link>
      <PageHeader
        title={`Editar ${current.full_name}`}
        description="Atualize os dados e a foto do cliente sem alterar seu histórico."
      />
      <ClientForm
        initialValues={{
          full_name: current.full_name,
          cpf: current.cpf ?? "",
          birth_date: current.birth_date ?? "",
          phone: current.phone ?? "",
          whatsapp: current.whatsapp ?? "",
          email: current.email ?? "",
          primary_goal: current.primary_goal ?? "",
          notes: current.notes ?? "",
        }}
        existingPhotoUrl={photo.data}
        submitLabel="Salvar alterações"
        onSubmit={submit}
      />
    </div>
  );
}
