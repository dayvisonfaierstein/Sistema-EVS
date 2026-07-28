import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  ExternalLink,
  Images,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { HERBALIFE_PE_PRICE_ROWS, HERBALIFE_PE_SOURCE } from "@/data/herbalife-pe-price-list";
import {
  analyzeHerbalifePeImport,
  getDefaultImportCostBasis,
  importHerbalifePeProducts,
  saveDefaultImportCostBasis,
  type HerbalifeImportPreviewRow,
  type ImportAction,
  type ImportCostBasis,
} from "@/services/product-import";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { parseProductImportFile } from "@/lib/product-import-file";
import { createSquareProductPhoto } from "@/lib/image-processing";
import { replaceProductPhotoBySku } from "@/services/products";
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
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<HerbalifeImportPreviewRow[]>([]);
  const [sourceRows, setSourceRows] = useState(HERBALIFE_PE_PRICE_ROWS);
  const [sourceLabel, setSourceLabel] = useState("Tabela Herbalife PE incorporada");
  const [sourceVersion, setSourceVersion] = useState(0);
  const [referenceDate, setReferenceDate] = useState<string>(HERBALIFE_PE_SOURCE.referenceDate);
  const [readingFile, setReadingFile] = useState(false);
  const [photoProgress, setPhotoProgress] = useState<string | null>(null);
  const [costBasis, setCostBasis] = useState<ImportCostBasis>("price_50");
  const [lastResult, setLastResult] = useState<{
    created: number;
    updated: number;
    skipped: number;
  } | null>(null);
  const preview = useQuery({
    queryKey: ["herbalife-pe-import-preview", sourceVersion],
    queryFn: () => analyzeHerbalifePeImport(sourceRows),
  });
  const savedCostBasis = useQuery({
    queryKey: ["default-product-cost-basis"],
    queryFn: getDefaultImportCostBasis,
  });

  useEffect(() => {
    if (preview.data) setRows(preview.data);
  }, [preview.data]);
  useEffect(() => {
    if (savedCostBasis.data) setCostBasis(savedCostBasis.data);
  }, [savedCostBasis.data]);

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
      setLastResult(result);
      setRows((current) => current.map((row) => ({ ...row, action: "skip" })));
      toast.success(`${result.created} produto(s) criado(s) e ${result.updated} atualizado(s).`);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível importar a tabela."),
  });
  const saveCostBasis = useMutation({
    mutationFn: saveDefaultImportCostBasis,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["default-product-cost-basis"] });
      toast.success("Faixa padrão da unidade atualizada.");
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Não foi possível salvar a faixa padrão.",
      ),
  });

  function setAction(sku: string, action: ImportAction) {
    setRows((current) => current.map((row) => (row.sku === sku ? { ...row, action } : row)));
  }

  async function loadImportFile(file?: File) {
    if (!file) return;
    setReadingFile(true);
    setLastResult(null);
    try {
      const parsed = await parseProductImportFile(file, referenceDate);
      setSourceRows(parsed);
      setSourceLabel(file.name);
      setSourceVersion((current) => current + 1);
      toast.success(`${parsed.length} produto(s) lido(s) de ${file.name}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível ler o arquivo.");
    } finally {
      setReadingFile(false);
    }
  }

  async function uploadPhotos(files: FileList | null) {
    if (!files?.length) return;
    let success = 0;
    const failures: string[] = [];
    setPhotoProgress(`Preparando 1 de ${files.length}...`);
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const sku = file.name
        .replace(/\.[^.]+$/, "")
        .split(/[\s_-]/)[0]
        .toUpperCase();
      setPhotoProgress(`Enviando ${index + 1} de ${files.length}: SKU ${sku}`);
      try {
        if (!/\.(jpe?g|png|webp)$/i.test(file.name) || file.size > 10 * 1024 * 1024) {
          throw new Error("formato ou tamanho inválido");
        }
        const optimized = await createSquareProductPhoto(file);
        await replaceProductPhotoBySku(sku, optimized);
        success += 1;
      } catch (error) {
        failures.push(`${sku}: ${error instanceof Error ? error.message : "falha no envio"}`);
      }
    }
    setPhotoProgress(null);
    await queryClient.invalidateQueries({ queryKey: ["products"] });
    if (success) toast.success(`${success} foto(s) associada(s) pelo SKU.`);
    if (failures.length)
      toast.error(`${failures.length} arquivo(s) não importado(s): ${failures.join("; ")}`);
  }

  function downloadCsvTemplate() {
    const content =
      "\uFEFFSKU;Produto;PV;Valor bruto;Base de ganhos;25%;35%;42%;50%;Data de referência\r\n";
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "modelo-importacao-produtos.csv";
    anchor.click();
    URL.revokeObjectURL(url);
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="size-5 text-primary" />
              Importar CSV ou XLSX
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Colunas: SKU, Produto, PV, Valor bruto, Base de ganhos, 25%, 35%, 42% e 50%. O arquivo
              será comparado antes da confirmação.
            </p>
            <Button type="button" size="sm" variant="outline" onClick={downloadCsvTemplate}>
              <Download />
              Baixar modelo CSV
            </Button>
            <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
              <label className="grid gap-1 text-xs text-muted-foreground">
                Data de referência
                <Input
                  type="date"
                  value={referenceDate}
                  onChange={(event) => setReferenceDate(event.target.value)}
                />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Arquivo
                <Input
                  type="file"
                  accept=".csv,.xlsx"
                  disabled={readingFile}
                  onChange={(event) => void loadImportFile(event.target.files?.[0])}
                />
              </label>
            </div>
            <p className="text-xs font-medium text-primary">Fonte atual: {sourceLabel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Images className="size-5 text-primary" />
              Fotos por SKU
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Nomeie cada arquivo com o SKU, por exemplo: <strong>0951.jpg</strong>. As imagens
              serão centralizadas, recortadas e otimizadas em 600 × 600 px.
            </p>
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={Boolean(photoProgress)}
              onChange={(event) => void uploadPhotos(event.target.files)}
            />
            {photoProgress && <p className="text-xs font-medium text-primary">{photoProgress}</p>}
          </CardContent>
        </Card>
      </div>

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
              onValueChange={(value) => {
                const next = value as ImportCostBasis;
                setCostBasis(next);
                saveCostBasis.mutate(next);
              }}
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
                <TableHead>Comparação anterior</TableHead>
                <TableHead>Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="h-28 text-center">
                    Analisando produtos...
                  </TableCell>
                </TableRow>
              )}
              {preview.isError && (
                <TableRow>
                  <TableCell colSpan={8} className="h-28 text-center text-destructive">
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
                    <TableCell className="text-xs">
                      {row.previousReferenceDate ? (
                        <>
                          <div>
                            PV: {row.previousPv?.toLocaleString("pt-BR") ?? "—"} →{" "}
                            {row.volume_points.toLocaleString("pt-BR")}
                          </div>
                          <div className="text-muted-foreground">
                            Bruto:{" "}
                            {row.previousGrossPrice === null
                              ? "—"
                              : money.format(row.previousGrossPrice)}{" "}
                            → {money.format(row.gross_price)}
                          </div>
                          <div className="text-muted-foreground">
                            Ref.{" "}
                            {new Date(`${row.previousReferenceDate}T12:00:00`).toLocaleDateString(
                              "pt-BR",
                            )}
                          </div>
                        </>
                      ) : (
                        "Sem histórico"
                      )}
                    </TableCell>
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
      {lastResult && (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-5 text-success" />
              <div>
                <p className="font-medium text-success">Importação concluída com sucesso</p>
                <p className="text-sm text-muted-foreground">
                  {lastResult.created} criado(s), {lastResult.updated} atualizado(s) e{" "}
                  {lastResult.skipped} ignorado(s).
                </p>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link to="/produtos">Ver produtos importados</Link>
            </Button>
          </CardContent>
        </Card>
      )}
      {importer.isError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex gap-3 p-4">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div>
              <p className="font-medium text-destructive">A importação não foi concluída</p>
              <p className="text-sm text-muted-foreground">
                {importer.error instanceof Error
                  ? importer.error.message
                  : "Ocorreu um erro inesperado. Tente novamente."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
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
