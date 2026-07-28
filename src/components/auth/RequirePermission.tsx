import type { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function RequirePermission({
  permission,
  anyOf,
  fallback = null,
  children,
}: {
  permission?: string;
  anyOf?: string[];
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { hasPermission } = useAuth();
  const permissions = anyOf ?? (permission ? [permission] : []);
  const allowed = permissions.length === 0 || permissions.some(hasPermission);

  return allowed ? children : fallback;
}
