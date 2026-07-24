import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search, Edit, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/layout/PageChrome";
import { produtos, brl } from "@/lib/mockData";
import { PendingModuleBanner } from "@/components/layout/PendingModuleBanner";

export const Route = createFileRoute("/_app/produtos")({
  head: () => ({ meta: [{ title: "Produtos — Espaço+" }] }),
  component: Produtos,
});

function Produtos() {
  return (
    <div className="space-y-5">
      <PendingModuleBanner />
      <PageHeader
        title="Produtos"
        description={`${produtos.length} produtos cadastrados`}
        actions={
          <Button>
            <Plus />
            Novo produto
          </Button>
        }
      />
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar produto, categoria..." className="pl-9" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Custo</TableHead>
                <TableHead>Venda</TableHead>
                <TableHead>Margem</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {produtos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="grid size-10 place-items-center rounded-lg bg-primary-soft text-primary">
                        <Package className="size-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{p.nome}</div>
                        <div className="text-xs text-muted-foreground">{p.marca}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{p.categoria}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.codigo}</TableCell>
                  <TableCell>{brl(p.precoCompra)}</TableCell>
                  <TableCell className="font-semibold">{brl(p.precoVenda)}</TableCell>
                  <TableCell className="text-success">
                    {Math.round(((p.precoVenda - p.precoCompra) / p.precoCompra) * 100)}%
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.estoque < p.estoqueMinimo ? "destructive" : "outline"}>
                      {p.estoque}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{p.validade}</TableCell>
                  <TableCell>
                    <Badge
                      className="border-success/30 bg-success/15 text-success"
                      variant="outline"
                    >
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon">
                      <Edit className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
