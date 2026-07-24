import { createFileRoute } from "@tanstack/react-router";
import { PartyPopper } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";
export const Route = createFileRoute("/_app/eventos")({
  head: () => ({ meta: [{ title: "Eventos — Espaço+" }] }),
  component: () => (
    <PlaceholderPage
      title="Eventos"
      description="Palestras, aulões, desafios e confirmações."
      icon={PartyPopper}
      actionLabel="Novo evento"
    />
  ),
});
