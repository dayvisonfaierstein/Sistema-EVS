import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Clock3, LogOut, RefreshCw, ShieldAlert } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/aguardando-ativacao")({
  head: () => ({ meta: [{ title: "Aguardando ativação — Espaço+" }] }),
  component: WaitingForActivation,
});

function WaitingForActivation() {
  const { session, profile, environment, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/login", replace: true });
    } else if (profile?.first_access) {
      navigate({ to: "/onboarding", replace: true });
    } else if (environment?.accessAllowed) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [environment, loading, navigate, profile, session]);

  if (loading || !session || environment?.accessAllowed) return null;

  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 p-4">
      <Card className="w-full max-w-xl">
        <CardContent className="p-8 text-center sm:p-10">
          <div className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-amber-100 text-amber-700">
            {environment?.onboardingCompleted ? (
              <Clock3 className="size-8" />
            ) : (
              <ShieldAlert className="size-8" />
            )}
          </div>
          <h1 className="text-2xl font-bold">
            {environment?.onboardingCompleted
              ? "Ambiente aguardando liberação"
              : "Configuração pendente"}
          </h1>
          <p className="mt-3 text-muted-foreground">
            {environment?.blockReason ??
              "O administrador precisa concluir a configuração inicial do Espaço."}
          </p>
          {environment?.organizationName && (
            <p className="mt-2 text-sm font-medium">{environment.organizationName}</p>
          )}
          <p className="mt-6 text-sm text-muted-foreground">
            Quando a assinatura for regularizada pelo administrador da plataforma, o acesso será
            liberado automaticamente.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw />
              Verificar novamente
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                void signOut().finally(() => navigate({ to: "/login", replace: true }));
              }}
            >
              <LogOut />
              Sair
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
