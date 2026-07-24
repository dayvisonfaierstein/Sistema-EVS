import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";
export const Route = createFileRoute("/_app/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Espaço+" }] }),
  component: () => (
    <PlaceholderPage
      title="Configurações"
      description="Dados da unidade, preferências e integrações."
      icon={Settings}
      actionLabel="Editar"
    />
  ),
});
