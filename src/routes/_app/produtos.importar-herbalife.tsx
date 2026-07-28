import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { HERBALIFE_PE_PRICE_ROWS, HERBALIFE_PE_SOURCE } from "@/data/herbalife-pe-price-list";
import {
  analyzeHerbalifePeImport,
  importHerbalifePeProducts,
  type HerbalifeImportPreviewRow,
  type ImportAction,
  type ImportCostBasis,
} from "@/services/product-import";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_app/produtos/importar-herbalife")({
  head: () => ({ meta: [{ title: "Importar tabela Herbalife PE — Espaço+" }] }),
  component: HerbalifePeImportPage,
});

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const costLabels: Record<ImportCostBasis, string> = {
  gross_price: "Valor bruto",
  price_25: "Faixa de 25%",
  price_35: "Faixa de 35%",
  price_42: "Faixa de 42%",
  price_50: "Faixa de 50%",
};

function HerbalifePeImportPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<HerbalifeImportPreviewRow[]>([]);
  const [costBasis, setCostBasis] = useState<ImportCostBasis>("price_50");
  const preview = useQuery({
    queryKey: ["herbalife-pe-import-preview"],
    queryFn: () => analyzeHerbalifePeImport(HERBALIFE_PE_PRICE_ROWS),
  });

  useEffect(() => {
    if (preview.data) setRows(preview.data);
  }, [preview.data]);

  const summary = useMemo(
    () => ({
      create: rows.filter((row) => row.action === "create").length,
      update: rows.filter((row) => row.action === "update").length,
      skip: rows.filter((row) => row.action === "skip").length,
      conflicts: rows.filter((row) => row.status === "conflict").length,
    }),
    [rows],
  );
  const importer = useMutation({
    mutationFn: () => importHerbalifePeProducts(rows, costBasis),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(`${result.created} produto(s) criado(s) e ${result.updated} atualizado(s).`);
      await navigate({ to: "/produtos" });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível importar a tabela."),
  });

  function setAction(sku: string, action: ImportAction) {
    setRows((current) => current.map((row) => (row.sku === sku ? { ...row, action } : row)));
  }

  return (
    <div className="space-y-5">
      <Link to="/produtos" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" />
        Produtos
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Importar tabela Herbalife PE
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Revise os produtos antes de confirmar. Registros existentes não são alterados
          automaticamente.
        </p>
      </div>

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="flex gap-3 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div className="text-sm">
            <p className="font-medium">Fonte pública de referência — Pernambuco</p>
            <p className="mt-1 text-muted-foreground">
              A página informa valores aproximados e possíveis variações tributárias. Referência
              registrada: 30/09/2024. Confirme os preços antes de utilizá-los comercialmente.
            </p>
            <a
              href={HERBALIFE_PE_SOURCE.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-primary hover:underline"
            >
              Consultar fonte original <ExternalLink className="size-3" />
            </a>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Novos" value={summary.create} tone="text-success" />
        <SummaryCard title="Atualizações" value={summary.update} tone="text-primary" />
        <SummaryCard title="Ignorados" value={summary.skip} tone="text-muted-foreground" />
        <SummaryCard title="Conflitos de nome" value={summary.conflicts} tone="text-amber-600" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuração de custo</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[280px_1fr] md:items-end">
          <div>
            <Label className="mb-1.5 block">Usar como custo de referência</Label>
            <Select
              value={costBasis}
              onValueChange={(value) => setCostBasis(value as ImportCostBasis)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(costLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground">
            O valor bruto será salvo como preço sugerido de venda. Todas as faixas permanecerão no
            histórico de preços de Pernambuco.
          </p>
        </CardContent>
      </Card>

      <Card>
        <div className="max-h-[58vh] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead className="w-12">Importar</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>PV</TableHead>
                <TableHead>Bruto</TableHead>
                <TableHead>{costLabels[costBasis]}</TableHead>
                <TableHead>Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="h-28 text-center">
                    Analisando produtos...
                  </TableCell>
                </TableRow>
              )}
              {preview.isError && (
                <TableRow>
                  <TableCell colSpan={7} className="h-28 text-center text-destructive">
                    Falha ao comparar a tabela com o catálogo.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((row) => {
                const selectableAction = row.status === "new" ? "create" : "update";
                return (
                  <TableRow key={row.sku}>
                    <TableCell>
                      <Checkbox
                        checked={row.action !== "skip"}
                        onCheckedChange={(checked) =>
                          setAction(row.sku, checked ? selectableAction : "skip")
                        }
                        aria-label={`Importar ${row.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                    <TableCell>
                      <div className="font-medium">{row.name}</div>
                      {row.status === "conflict" && (
                        <div className="text-xs text-amber-700">No sistema: {row.existingName}</div>
                      )}
                    </TableCell>
                    <TableCell>{row.volume_points.toLocaleString("pt-BR")}</TableCell>
                    <TableCell>{money.format(row.gross_price)}</TableCell>
                    <TableCell>{money.format(row[costBasis])}</TableCell>
                    <TableCell>
                      <StatusBadge row={row} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Serão criados {summary.create} e atualizados {summary.update} produto(s).
        </p>
        <Button
          onClick={() => importer.mutate()}
          disabled={importer.isPending || summary.create + summary.update === 0}
        >
          <Download />
          {importer.isPending ? "Importando..." : "Confirmar importação"}
        </Button>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, tone }: { title: string; value: number; tone: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{title}</div>
        <div className={`mt-1 text-2xl font-bold ${tone}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ row }: { row: HerbalifeImportPreviewRow }) {
  if (row.action === "update") return <Badge>Atualizar selecionado</Badge>;
  if (row.action === "skip")
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Ignorado
      </Badge>
    );
  if (row.status === "new") return <Badge className="bg-success">Novo</Badge>;
  if (row.status === "conflict")
    return (
      <Badge variant="outline" className="border-amber-500/30 text-amber-700">
        <AlertTriangle />
        Conflito
      </Badge>
    );
  return (
    <Badge variant="outline">
      <CheckCircle2 />
      Já cadastrado
    </Badge>
  );
}
