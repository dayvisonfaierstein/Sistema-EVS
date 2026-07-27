import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageChrome";
import { ClientForm, type ClientFormValues } from "@/components/clients/ClientForm";
import { toast } from "sonner";
import { createClient } from "@/services/clients";

export const Route = createFileRoute("/_app/clientes/novo")({
  head: () => ({ meta: [{ title: "Novo cliente — Espaço+" }] }),
  component: NewClient,
});

function NewClient() {
  const navigate = useNavigate();

  async function submit(values: ClientFormValues, photo: File | null) {
    try {
      const client = await createClient(
        {
          ...values,
          cpf: values.cpf || null,
          phone: values.phone || null,
          whatsapp: values.whatsapp || null,
          email: values.email || null,
          primary_goal: values.primary_goal || null,
          notes: values.notes || null,
          status: "new",
        },
        photo,
      );
      toast.success("Cliente cadastrado com sucesso.");
      await navigate({ to: "/clientes/$id", params: { id: client.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao cadastrar cliente.");
      throw error;
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Novo cliente"
        description="Nome e data de nascimento são os únicos campos obrigatórios."
      />
      <ClientForm submitLabel="Concluir cadastro" onSubmit={submit} />
    </div>
  );
}
