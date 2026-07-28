import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, Edit, Eye, Package, Plus, Search } from "lucide-react";
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

export const Route = createFileRoute("/_app/produtos")({
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
            <Button asChild variant="outline">
              <Link to="/produtos/importar-herbalife">
                <Download />
                Importar tabela PE
              </Link>
            </Button>
            <Button asChild>
              <Link to="/produtos/novo">
                <Plus />
                Novo produto
              </Link>
            </Button>
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
                        <Button asChild variant="ghost" size="icon" title="Editar produto">
                          <Link to="/produtos/editar/$id" params={{ id: product.id }}>
                            <Edit />
                          </Link>
                        </Button>
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
