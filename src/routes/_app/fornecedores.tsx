import { createFileRoute } from "@tanstack/react-router";
import { Truck } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";
export const Route = createFileRoute("/_app/fornecedores")({
  head: () => ({ meta: [{ title: "Fornecedores — Espaço+" }] }),
  component: () => (
    <PlaceholderPage
      title="Fornecedores"
      description="Cadastro de parceiros e histórico de compras."
      icon={Truck}
      actionLabel="Novo fornecedor"
    />
  ),
});
