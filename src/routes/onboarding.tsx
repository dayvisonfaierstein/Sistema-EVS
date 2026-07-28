import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, KeyRound, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Primeiro acesso — Espaço+" }] }),
  component: FirstAccess,
});

function FirstAccess() {
  const { session, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/login", replace: true });
    } else if (profile && !profile.first_access) {
      navigate({
        to:
          profile.is_platform_admin || profile.role === "super_admin"
            ? "/admin"
            : profile.role === "client"
              ? "/portal"
              : "/dashboard",
        replace: true,
      });
    }
  }, [loading, navigate, profile, session]);

  const expired = Boolean(
    profile?.first_access &&
    profile.provisional_access_expires_at &&
    new Date(profile.provisional_access_expires_at) < new Date(),
  );

  async function complete() {
    if (fullName.trim().length < 3) return toast.error("Informe seu nome completo.");
    if (password.length < 8)
      return toast.error("A nova senha precisa ter pelo menos 8 caracteres.");
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password))
      return toast.error("Use letras maiúsculas, minúsculas e pelo menos um número.");
    if (password !== confirmation) return toast.error("As senhas não são iguais.");

    setSaving(true);
    try {
      const supabase = getSupabase();
      const { error: passwordError } = await supabase.auth.updateUser({ password });
      if (passwordError) throw passwordError;

      const { error: profileError } = await supabase.rpc("complete_first_access", {
        p_full_name: fullName.trim(),
        p_phone: phone.trim() || null,
      });
      if (profileError) throw profileError;

      toast.success("Primeiro acesso concluído.");
      window.location.assign("/dashboard");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível concluir o primeiro acesso.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading || !session) return null;

  if (!profile)
    return (
      <div className="grid min-h-screen place-items-center bg-muted/30 p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8 text-center">
            <ShieldCheck className="mx-auto mb-4 size-10 text-primary" />
            <h1 className="text-xl font-bold">Acesso ainda não provisionado</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sua conta do Supabase existe, mas não está vinculada a um Espaço. Entre em contato com
              o administrador da plataforma.
            </p>
            <Button className="mt-6" onClick={() => navigate({ to: "/login" })}>
              Voltar ao login
            </Button>
          </CardContent>
        </Card>
      </div>
    );

  if (expired)
    return (
      <div className="grid min-h-screen place-items-center bg-muted/30 p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8 text-center">
            <KeyRound className="mx-auto mb-4 size-10 text-destructive" />
            <h1 className="text-xl font-bold">Acesso provisório expirado</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Solicite ao suporte do Espaço+ a emissão de um novo acesso seguro.
            </p>
          </CardContent>
        </Card>
      </div>
    );

  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <div className="mb-3 grid size-12 place-items-center rounded-xl bg-primary-soft text-primary">
            <KeyRound />
          </div>
          <CardTitle>Conclua seu primeiro acesso</CardTitle>
          <p className="text-sm text-muted-foreground">
            Confirme seus dados e substitua a senha provisória por uma senha pessoal.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="first-access-name">Nome completo</Label>
            <Input
              id="first-access-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="first-access-phone">Telefone</Label>
            <Input
              id="first-access-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first-access-password">Nova senha</Label>
              <Input
                id="first-access-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="first-access-confirmation">Confirmar senha</Label>
              <Input
                id="first-access-confirmation"
                type="password"
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </div>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Use pelo menos 8 caracteres, com letras maiúsculas, minúsculas e números. Sua senha será
            armazenada exclusivamente pelo Supabase Auth.
          </p>
          <Button onClick={() => void complete()} disabled={saving}>
            <CheckCircle2 />
            {saving ? "Ativando acesso..." : "Concluir primeiro acesso"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
