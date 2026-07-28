import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/produtos")({
  component: ProductsLayout,
});

function ProductsLayout() {
  return <Outlet />;
}
