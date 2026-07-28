import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import type { Profile, UserRole } from "@/types/database";

type AuthValue = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  configured: boolean;
  signIn(email: string, password: string): Promise<void>;
  resetPassword(email: string): Promise<void>;
  signOut(): Promise<void>;
  can(...roles: UserRole[]): boolean;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(configured);

  useEffect(() => {
    if (!configured) return;
    const supabase = getSupabase();
    const loadProfile = async (next: Session | null) => {
      setSession(next);
      if (!next) {
        setProfile(null);
        setLoading(false);
        return;
      }
      const { data } = await supabase.from("profiles").select("*").eq("id", next.user.id).single();
      setProfile(data as Profile | null);
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
    }),
    [configured, loading, profile, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return value;
}
