import { createFileRoute } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";
export const Route = createFileRoute("/_app/usuarios")({
  head: () => ({ meta: [{ title: "Usuários — Espaço+" }] }),
  component: () => (
    <PlaceholderPage
      title="Usuários"
      description="Administradores, atendentes, avaliadores e permissões."
      icon={Shield}
      actionLabel="Novo usuário"
    />
  ),
});
