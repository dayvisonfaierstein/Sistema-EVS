import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { session, profile, loading, configured } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (configured && !loading && (!session || !profile?.active)) navigate({ to: "/login" });
  }, [configured, loading, navigate, profile, session]);
  if (configured && loading)
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Carregando ambiente seguro...
      </div>
    );
  if (configured && (!session || !profile?.active)) return null;
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
