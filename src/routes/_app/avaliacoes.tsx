import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/avaliacoes")({
  component: AssessmentsLayout,
});

function AssessmentsLayout() {
  return <Outlet />;
}
