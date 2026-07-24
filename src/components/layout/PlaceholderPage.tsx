import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";
import { Sparkles, Plus } from "lucide-react";
import { PageHeader } from "./PageChrome";

export function PlaceholderPage({
  title,
  description,
  icon: Icon = Sparkles,
  actionLabel = "Novo cadastro",
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  actionLabel?: string;
}) {
  return (
    <div className="space-y-5">
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button>
            <Plus />
            {actionLabel}
          </Button>
        }
      />
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-20 text-center">
          <div className="grid size-16 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Icon className="size-7" />
          </div>
          <div className="max-w-md">
            <div className="text-lg font-semibold">Módulo em desenvolvimento</div>
            <p className="mt-1 text-sm text-muted-foreground">
              A tela de <strong>{title}</strong> faz parte do sistema completo e pode ser detalhada
              em uma próxima iteração. A estrutura, o menu e a navegação já estão prontos.
            </p>
          </div>
          <Button variant="outline">Sugerir prioridade</Button>
        </CardContent>
      </Card>
    </div>
  );
}
