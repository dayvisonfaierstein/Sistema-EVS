import { Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getRouteRequirement } from "@/lib/permissions";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { session, profile, environment, loading, configured, hasPermission } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  useEffect(() => {
    if (!configured || loading) return;
    if (!session || !profile?.active) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (profile.first_access) {
      navigate({ to: "/onboarding", replace: true });
      return;
    }
    if (environment?.accessAllowed === false) {
      navigate({ to: "/aguardando-ativacao", replace: true });
      return;
    }
    const requirement = getRouteRequirement(pathname);
    if (requirement && !requirement.anyOf.some(hasPermission)) {
      navigate({ to: "/sem-permissao", replace: true });
    }
  }, [configured, environment, hasPermission, loading, navigate, pathname, profile, session]);
  if (configured && loading)
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Carregando ambiente seguro...
      </div>
    );
  if (
    configured &&
    (!session || !profile?.active || profile.first_access || environment?.accessAllowed === false)
  )
    return null;
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 p-4 sm:p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
      <Toaster richColors position="top-right" />
    </SidebarProvider>
  );
}
