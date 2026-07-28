import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, LogOut, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/sem-permissao")({
  head: () => ({ meta: [{ title: "Acesso não autorizado — Espaço+" }] }),
  component: Unauthorized,
});

function Unauthorized() {
  const { hasPermission, signOut } = useAuth();
  const canOpenDashboard = hasPermission("dashboard.view");

  return (
    <main className="grid min-h-screen place-items-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg border-border/70 shadow-sm">
        <CardContent className="flex flex-col items-center p-8 text-center sm:p-10">
          <div className="mb-5 grid size-16 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldX className="size-8" />
          </div>
          <h1 className="text-2xl font-bold">Acesso não autorizado</h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
            Seu usuário não possui permissão para acessar esta área. Se precisar deste recurso,
            solicite a liberação ao administrador do seu Espaço.
          </p>
          <Button asChild className="mt-7">
            {canOpenDashboard ? (
              <Link to="/dashboard">
                <ArrowLeft />
                Voltar ao início
              </Link>
            ) : (
              <button type="button" onClick={() => void signOut()}>
                <LogOut />
                Sair do sistema
              </button>
            )}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
