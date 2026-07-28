import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, Edit, Eye, Package, Plus, Printer, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageChrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import {
  listProductCategories,
  getProductPhotoUrls,
  listProducts,
  type ProductFilters,
} from "@/services/products";
import type { Product } from "@/types/database";
import { RequirePermission } from "@/components/auth/RequirePermission";

export const Route = createFileRoute("/_app/produtos/")({
  head: () => ({ meta: [{ title: "Produtos — Espaço+" }] }),
  component: ProductsPage,
});

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function stockStatus(product: Product) {
  if (!product.active)
    return { label: "Inativo", style: "border-muted-foreground/30 text-muted-foreground" };
  if (product.current_stock <= 0)
    return {
      label: "Sem estoque",
      style: "border-destructive/30 bg-destructive/10 text-destructive",
    };
  if (product.current_stock <= product.minimum_stock)
    return { label: "Estoque baixo", style: "border-amber-500/30 bg-amber-500/10 text-amber-700" };
  return { label: "Em estoque", style: "border-success/30 bg-success/10 text-success" };
}

function escapeHtml(value: string) {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };

  return value.replace(/[&<>"']/g, (character) => entities[character]);
}

function printProductList(products: Product[]) {
  const printWindow = window.open("", "_blank", "width=1100,height=800");

  if (!printWindow) {
    toast.error("Não foi possível abrir a impressão. Permita pop-ups para este site.");
    return;
  }

  const generatedAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());
  const rows = products
    .map((product) => {
      const status = stockStatus(product).label;
      const stock = `${product.current_stock.toLocaleString("pt-BR")} ${product.consumption_unit}`;

      return `
        <tr>
          <td><strong>${escapeHtml(product.name)}</strong></td>
          <td>${escapeHtml(product.sku || "—")}</td>
          <td>${escapeHtml(product.product_categories?.name || "Sem categoria")}</td>
          <td class="numeric">${product.volume_points?.toLocaleString("pt-BR") ?? "—"}</td>
          <td class="numeric">${escapeHtml(money.format(product.sale_price))}</td>
          <td class="numeric">${escapeHtml(stock)}</td>
          <td>${escapeHtml(status)}</td>
        </tr>`;
    })
    .join("");

  printWindow.document.write(`<!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Lista de produtos — Espaço+</title>
        <style>
          @page { size: A4 landscape; margin: 12mm; }
          * { box-sizing: border-box; }
          body { margin: 0; color: #14231b; font-family: Arial, sans-serif; font-size: 10pt; }
          header { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; margin-bottom: 18px; }
          h1 { margin: 0 0 5px; color: #08783f; font-size: 22pt; }
          p { margin: 0; color: #647067; }
          .summary { text-align: right; white-space: nowrap; }
          table { width: 100%; border-collapse: collapse; }
          thead { display: table-header-group; }
          tr { break-inside: avoid; }
          th { padding: 9px 8px; border-bottom: 2px solid #159851; background: #edf8f0; color: #075b34; text-align: left; font-size: 9pt; }
          td { padding: 8px; border-bottom: 1px solid #dfe7e1; vertical-align: top; }
          tbody tr:nth-child(even) { background: #f8faf8; }
          .numeric { text-align: right; white-space: nowrap; }
          footer { margin-top: 14px; color: #7a857d; font-size: 8pt; text-align: right; }
        </style>
      </head>
      <body>
        <header>
          <div>
            <h1>Espaço+</h1>
            <p>Lista de produtos cadastrados</p>
          </div>
          <div class="summary">
            <strong>${products.length} produto(s)</strong>
            <p>Emitido em ${escapeHtml(generatedAt)}</p>
          </div>
        </header>
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th>SKU</th>
              <th>Categoria</th>
              <th class="numeric">PV</th>
              <th class="numeric">Preço de venda</th>
              <th class="numeric">Estoque</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <footer>Espaço+ • Gestão inteligente para transformar resultados</footer>
      </body>
    </html>`);
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => printWindow.print(), 250);
}

function ProductsPage() {
  const [filters, setFilters] = useState<ProductFilters>({ active: "all", stock: "all" });
  const products = useQuery({
    queryKey: ["products", filters],
    queryFn: () => listProducts(filters),
  });
  const photos = useQuery({
    queryKey: ["product-photos", products.data?.map((product) => product.photo_url)],
    queryFn: () => getProductPhotoUrls((products.data ?? []).map((product) => product.photo_url)),
    enabled: Boolean(products.data?.some((product) => product.photo_url)),
  });
  const categories = useQuery({
    queryKey: ["product-categories", "active"],
    queryFn: () => listProductCategories(),
  });
  const setFilter = <K extends keyof ProductFilters>(key: K, value: ProductFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Produtos"
        description={
          products.isLoading
            ? "Carregando catálogo..."
            : `${products.data?.length ?? 0} produto(s) encontrado(s)`
        }
        actions={
          <>
            <RequirePermission permission="products.export">
              <Button
                variant="outline"
                onClick={() => printProductList(products.data ?? [])}
                disabled={products.isLoading || products.isError || !products.data?.length}
              >
                <Printer />
                Imprimir lista
              </Button>
            </RequirePermission>
            <RequirePermission anyOf={["products.create", "products.update"]}>
              <Button asChild variant="outline">
                <Link to="/produtos/importar-herbalife">
                  <Download />
                  Importar tabela PE
                </Link>
              </Button>
            </RequirePermission>
            <RequirePermission permission="products.create">
              <Button asChild>
                <Link to="/produtos/novo">
                  <Plus />
                  Novo produto
                </Link>
              </Button>
            </RequirePermission>
          </>
        }
      />
      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.search ?? ""}
              onChange={(event) => setFilter("search", event.target.value)}
              placeholder="Buscar por nome ou SKU..."
              className="pl-9"
            />
          </div>
          <FilterSelect
            value={filters.categoryId ?? "all"}
            onChange={(value) => setFilter("categoryId", value === "all" ? undefined : value)}
            options={[
              ["all", "Todas as categorias"],
              ...(categories.data ?? []).map((item) => [item.id, item.name] as const),
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <FilterSelect
              value={filters.active ?? "all"}
              onChange={(value) => setFilter("active", value as ProductFilters["active"])}
              options={[
                ["all", "Todos"],
                ["active", "Ativos"],
                ["inactive", "Inativos"],
              ]}
            />
            <FilterSelect
              value={filters.stock ?? "all"}
              onChange={(value) => setFilter("stock", value as ProductFilters["stock"])}
              options={[
                ["all", "Todo estoque"],
                ["in_stock", "Em estoque"],
                ["low", "Estoque baixo"],
                ["out", "Sem estoque"],
              ]}
            />
          </div>
        </CardContent>
      </Card>
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead>PV</TableHead>
                <TableHead>Custo médio</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(products.isLoading || products.isError || products.data?.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="h-28 text-center text-muted-foreground">
                    {products.isLoading
                      ? "Carregando produtos..."
                      : products.isError
                        ? "Não foi possível carregar o catálogo."
                        : "Nenhum produto encontrado. Cadastre o primeiro produto."}
                  </TableCell>
                </TableRow>
              )}
              {products.data?.map((product) => {
                const status = stockStatus(product);
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Link
                        to="/produtos/$id"
                        params={{ id: product.id }}
                        className="flex items-center gap-3 hover:text-primary"
                      >
                        <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-primary-soft text-primary">
                          {product.photo_url && photos.data?.[product.photo_url] ? (
                            <img
                              src={photos.data[product.photo_url]}
                              alt={product.name}
                              className="size-full object-contain"
                            />
                          ) : (
                            <Package className="size-5" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {product.brand || "Marca não informada"}
                          </div>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{product.sku || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {product.product_categories?.name || "Sem categoria"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {product.current_stock.toLocaleString("pt-BR")}{" "}
                      <span className="text-xs text-muted-foreground">
                        {product.consumption_unit}
                      </span>
                    </TableCell>
                    <TableCell>{product.volume_points?.toLocaleString("pt-BR") ?? "—"}</TableCell>
                    <TableCell>{money.format(product.average_cost)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={status.style}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button asChild variant="ghost" size="icon" title="Ver produto">
                          <Link to="/produtos/$id" params={{ id: product.id }}>
                            <Eye />
                          </Link>
                        </Button>
                        <RequirePermission permission="products.update">
                          <Button asChild variant="ghost" size="icon" title="Editar produto">
                            <Link to="/produtos/editar/$id" params={{ id: product.id }}>
                              <Edit />
                            </Link>
                          </Button>
                        </RequirePermission>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(([key, label]) => (
          <SelectItem key={key} value={key}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
