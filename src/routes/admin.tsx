import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AdminShell } from "@/components/admin/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/admin")({
  component: AdminLayoutRoute,
});

function AdminLayoutRoute() {
  const { session, profile, loading, configured } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = Boolean(profile?.is_platform_admin || profile?.role === "super_admin");

  useEffect(() => {
    if (!configured || loading) return;
    if (!session || !profile?.active) {
      navigate({ to: "/login", replace: true });
    } else if (profile.first_access) {
      navigate({ to: "/onboarding", replace: true });
    } else if (!isSuperAdmin) {
      navigate({ to: "/sem-permissao", replace: true });
    }
  }, [configured, isSuperAdmin, loading, navigate, profile, session]);

  if (configured && loading)
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Carregando administração segura...
      </div>
    );
  if (!session || !profile?.active || profile.first_access || !isSuperAdmin) return null;

  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
