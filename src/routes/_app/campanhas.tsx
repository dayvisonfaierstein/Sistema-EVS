import { createFileRoute } from "@tanstack/react-router";
import { Megaphone } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";
export const Route = createFileRoute("/_app/campanhas")({
  head: () => ({ meta: [{ title: "Campanhas — Espaço+" }] }),
  component: () => (
    <PlaceholderPage
      title="Campanhas"
      description="Promoções, reativação de clientes e ofertas."
      icon={Megaphone}
      actionLabel="Nova campanha"
    />
  ),
});
