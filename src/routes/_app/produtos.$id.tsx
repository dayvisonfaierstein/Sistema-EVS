import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Barcode, Edit, Package, Scale, Tag } from "lucide-react";
import { PageHeader } from "@/components/layout/PageChrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProduct } from "@/services/products";

export const Route = createFileRoute("/_app/produtos/$id")({
  head: () => ({ meta: [{ title: "Detalhes do produto — Espaço+" }] }),
  component: ProductDetailPage,
});

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function ProductDetailPage() {
  const { id } = Route.useParams();
  const product = useQuery({ queryKey: ["product", id], queryFn: () => getProduct(id) });
  if (product.isLoading)
    return <p className="text-sm text-muted-foreground">Carregando produto...</p>;
  if (!product.data) return <p className="text-sm text-destructive">Produto não encontrado.</p>;
  const p = product.data;
  return (
    <div className="space-y-5">
      <Link to="/produtos" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" />
        Produtos
      </Link>
      <PageHeader
        title={p.name}
        description={[p.brand, p.sku ? `SKU ${p.sku}` : null].filter(Boolean).join(" • ")}
        actions={
          <Button asChild>
            <Link to="/produtos/editar/$id" params={{ id }}>
              <Edit />
              Editar produto
            </Link>
          </Button>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="size-5 text-primary" />
              Cadastro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge variant={p.active ? "default" : "outline"}>
                {p.active ? "Ativo" : "Inativo"}
              </Badge>
              <Badge variant="outline">{p.product_categories?.name || "Sem categoria"}</Badge>
              <Badge variant="outline">
                {p.verification_status === "verified"
                  ? "Dados conferidos"
                  : p.verification_status === "updated"
                    ? "Dados atualizados"
                    : "Conferência pendente"}
              </Badge>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Detail label="Marca" value={p.brand} icon={<Tag />} />
              <Detail label="SKU" value={p.sku} icon={<Barcode />} />
              <Detail label="Código de barras" value={p.barcode} icon={<Barcode />} />
              <Detail label="Subcategoria" value={p.subcategory} icon={<Tag />} />
              <Detail
                label="Conteúdo da embalagem"
                value={
                  p.package_content
                    ? `${p.package_content.toLocaleString("pt-BR")} ${p.content_unit ?? ""}`
                    : null
                }
                icon={<Scale />}
              />
              <Detail
                label="Controle de lotes"
                value={p.track_batches ? "Ativado" : "Desativado"}
                icon={<Package />}
              />
            </dl>
            {p.description && <TextBlock title="Descrição" text={p.description} />}
            {p.notes && <TextBlock title="Observações" text={p.notes} />}
          </CardContent>
        </Card>
        <div className="grid content-start gap-5 sm:grid-cols-2 lg:grid-cols-1">
          <Card>
            <CardHeader>
              <CardTitle>Estoque</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Metric
                label="Saldo atual"
                value={`${p.current_stock.toLocaleString("pt-BR")} ${p.consumption_unit}`}
              />
              <Metric
                label="Estoque mínimo"
                value={`${p.minimum_stock.toLocaleString("pt-BR")} ${p.consumption_unit}`}
              />
              <Metric label="Unidade de entrada" value={p.stock_unit} />
              <Metric label="Unidade de consumo" value={p.consumption_unit} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Valores</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Metric
                label="Pontos de Volume"
                value={p.volume_points?.toLocaleString("pt-BR") ?? "—"}
              />
              <Metric label="Custo de referência" value={money.format(p.cost_price)} />
              <Metric label="Custo médio" value={money.format(p.average_cost)} />
              <Metric label="Preço de venda" value={money.format(p.sale_price)} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | null;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex gap-2">
      <span className="mt-0.5 text-primary [&>svg]:size-4">{icon}</span>
      <div>
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="text-sm font-medium">{value || "Não informado"}</dd>
      </div>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}
function TextBlock({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <div className="text-sm font-medium">{title}</div>
      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
