import { Construction } from "lucide-react";

export function PendingModuleBanner() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
      <Construction className="mt-0.5 size-4 shrink-0" />
      <span>
        Módulo visual em preparação. Os dados exibidos aqui são demonstrativos e nenhuma alteração
        será persistida nesta etapa.
      </span>
    </div>
  );
}
