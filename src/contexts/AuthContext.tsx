import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import type { Profile, UserRole } from "@/types/database";

type AuthValue = {
  session: Session | null;
  profile: Profile | null;
  permissions: string[];
  environment: EnvironmentAccess | null;
  loading: boolean;
  configured: boolean;
  signIn(email: string, password: string): Promise<void>;
  resetPassword(email: string): Promise<void>;
  signOut(): Promise<void>;
  can(...roles: UserRole[]): boolean;
  hasPermission(permission: string): boolean;
};

export type EnvironmentAccess = {
  organizationId: string | null;
  organizationName: string | null;
  onboardingCompleted: boolean;
  organizationStatus: string;
  subscriptionStatus: string;
  accessAllowed: boolean;
  blockReason: string | null;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [environment, setEnvironment] = useState<EnvironmentAccess | null>(null);
  const [loading, setLoading] = useState(configured);

  useEffect(() => {
    if (!configured) return;
    const supabase = getSupabase();
    const loadProfile = async (next: Session | null) => {
      setSession(next);
      if (!next) {
        setProfile(null);
        setPermissions([]);
        setEnvironment(null);
        setLoading(false);
        return;
      }
      const [{ data }, permissionResult, environmentResult] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", next.user.id).single(),
        supabase.rpc("get_my_permissions"),
        supabase.rpc("get_my_environment_access"),
      ]);
      setProfile(data as Profile | null);
      setPermissions(
        (permissionResult.data ?? []).map(
          (item: { permission_key: string }) => item.permission_key,
        ),
      );
      const environmentRow = environmentResult.data?.[0] as
        | {
            organization_id: string | null;
            organization_name: string | null;
            onboarding_completed: boolean;
            organization_status: string;
            subscription_status: string;
            access_allowed: boolean;
            block_reason: string | null;
          }
        | undefined;
      setEnvironment(
        environmentRow
          ? {
              organizationId: environmentRow.organization_id,
              organizationName: environmentRow.organization_name,
              onboardingCompleted: environmentRow.onboarding_completed,
              organizationStatus: environmentRow.organization_status,
              subscriptionStatus: environmentRow.subscription_status,
              accessAllowed: environmentRow.access_allowed,
              blockReason: environmentRow.block_reason,
            }
          : null,
      );
      if (data?.active) {
        await supabase
          .from("profiles")
          .update({ last_access_at: new Date().toISOString() })
          .eq("id", next.user.id);
      }
      setLoading(false);
    };
    supabase.auth.getSession().then(({ data }) => loadProfile(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => loadProfile(next));
    return () => listener.subscription.unsubscribe();
  }, [configured]);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      profile,
      permissions,
      environment,
      loading,
      configured,
      async signIn(email, password) {
        const { error } = await getSupabase().auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      async resetPassword(email) {
        const redirectTo =
          typeof window === "undefined" ? undefined : `${window.location.origin}/login`;
        const { error } = await getSupabase().auth.resetPasswordForEmail(email, { redirectTo });
        if (error) throw error;
      },
      async signOut() {
        const { error } = await getSupabase().auth.signOut();
        if (error) throw error;
      },
      can(...roles) {
        return Boolean(
          profile &&
          (profile.is_platform_admin ||
            profile.is_organization_admin ||
            profile.role === "super_admin" ||
            profile.role === "administrator" ||
            roles.includes(profile.role)),
        );
      },
      hasPermission(permission) {
        return Boolean(
          profile &&
          (profile.is_platform_admin ||
            profile.is_organization_admin ||
            profile.role === "super_admin" ||
            profile.role === "administrator" ||
            permissions.includes(permission)),
        );
      },
    }),
    [configured, environment, loading, permissions, profile, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return value;
}
