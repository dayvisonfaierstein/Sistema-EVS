import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import LoginPage, { type LoginCredentials } from "@/components/auth/LoginPage";
import { useAuth } from "@/contexts/AuthContext";
import { APP_VERSION_LABEL } from "@/lib/version";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Espaço+" },
      { name: "description", content: "Gestão inteligente para Espaços Vida Saudável." },
    ],
  }),
  component: LoginRoute,
});

function resolveLoginIdentifier(identifier: string) {
  if (identifier.toLowerCase() !== "admin") return identifier;
  const adminEmail = import.meta.env.VITE_ADMIN_LOGIN_EMAIL?.trim();
  if (!adminEmail) {
    throw new Error("O acesso “admin” ainda não foi vinculado a um e-mail no ambiente.");
  }
  return adminEmail;
}

function LoginRoute() {
  const navigate = useNavigate();
  const { signIn, resetPassword, session, profile, configured } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session && profile?.active) {
      navigate({ to: profile.role === "client" ? "/portal" : "/dashboard" });
    } else if (session && !profile) {
      navigate({ to: "/onboarding" });
    }
  }, [navigate, profile, session]);

  async function handleLogin({ email, password }: LoginCredentials) {
    setError(null);
    if (!configured) {
      setError("Configure o Supabase para entrar.");
      return;
    }
    setSubmitting(true);
    try {
      await signIn(resolveLoginIdentifier(email), password);
      toast.success("Acesso autorizado.");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Não foi possível entrar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotPassword(identifier: string) {
    setError(null);
    if (!identifier) {
      setError("Informe seu usuário ou e-mail primeiro.");
      return;
    }
    try {
      await resetPassword(resolveLoginIdentifier(identifier));
      toast.success("Enviamos as instruções de recuperação.");
    } catch (recoverError) {
      setError(
        recoverError instanceof Error
          ? recoverError.message
          : "Falha ao solicitar recuperação de senha.",
      );
    }
  }

  return (
    <LoginPage
      onLogin={handleLogin}
      onForgotPassword={handleForgotPassword}
      loading={submitting}
      error={error}
      unitName="Unidade Centro"
      heroImageSrc="/images/login-wellness.png"
      showGoogleLogin={false}
      version={APP_VERSION_LABEL}
      configured={configured}
    />
  );
}
