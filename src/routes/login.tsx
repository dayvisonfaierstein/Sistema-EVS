import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Leaf, Lock, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Espaço+" },
      { name: "description", content: "Gestão inteligente para Espaços Vida Saudável." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const { signIn, resetPassword, session, profile, configured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (session && profile?.active)
      nav({ to: profile.role === "client" ? "/portal" : "/dashboard" });
    else if (session && !profile) nav({ to: "/onboarding" });
  }, [nav, profile, session]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!configured) return toast.error("Configure o Supabase no arquivo .env para entrar.");
    setSubmitting(true);
    try {
      await signIn(email, password);
      toast.success("Acesso autorizado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setSubmitting(false);
    }
  }
  async function recover() {
    if (!email) return toast.error("Informe seu e-mail primeiro.");
    try {
      await resetPassword(email);
      toast.success("Enviamos as instruções de recuperação.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao solicitar recuperação.");
    }
  }
  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.1),transparent_50%)]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-white/20">
              <Leaf className="size-6" />
            </div>
            <div>
              <div className="text-lg font-bold">Espaço+</div>
              <div className="text-xs opacity-80">Gestão inteligente para transformar vidas</div>
            </div>
          </div>
          <div className="max-w-md space-y-4">
            <h1 className="text-4xl font-bold leading-tight">
              Transforme vidas e faça seu Espaço Vida Saudável crescer.
            </h1>
            <p className="text-primary-foreground/80">
              Acompanhe clientes, avaliações e resultados em um só lugar.
            </p>
            <div className="flex items-center gap-2 text-sm">
              <ShieldCheck className="size-4" /> Dados protegidos e separados por organização.
            </div>
          </div>
          <div className="text-xs opacity-70">© 2026 Espaço+ · Todos os direitos reservados</div>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Leaf className="size-5" />
            </div>
            <div>
              <div className="font-bold">Espaço+</div>
              <div className="text-xs text-muted-foreground">Vida Saudável</div>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Bem-vindo de volta</h2>
            <p className="text-sm text-muted-foreground">Entre com sua conta para continuar.</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="senha">Senha</Label>
                <button
                  type="button"
                  onClick={recover}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="senha"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox defaultChecked /> Lembrar meu acesso
            </label>
            <Button type="submit" size="lg" disabled={submitting} className="w-full">
              {submitting ? "Entrando..." : "Entrar"}
            </Button>
          </form>
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">acesso protegido</span>
            <Separator className="flex-1" />
          </div>
          {!configured && (
            <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs">
              Ambiente ainda não conectado. Preencha as variáveis do Supabase para liberar o acesso
              real.
            </p>
          )}
          <p className="text-center text-xs text-muted-foreground">
            É cliente do Espaço?{" "}
            <Link to="/portal" className="font-medium text-primary hover:underline">
              Acessar portal do cliente
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
