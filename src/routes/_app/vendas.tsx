import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Minus, Trash2, Search, ShoppingCart, Receipt, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageChrome";
import { produtos, brl, clientes } from "@/lib/mockData";
import { PendingModuleBanner } from "@/components/layout/PendingModuleBanner";

export const Route = createFileRoute("/_app/vendas")({
  head: () => ({ meta: [{ title: "PDV — Espaço+" }] }),
  component: PDV,
});

function PDV() {
  const [carrinho, setCarrinho] = useState<{ id: string; qtd: number }[]>([
    { id: "3", qtd: 1 },
    { id: "4", qtd: 2 },
  ]);
  const [busca, setBusca] = useState("");
  const [desconto, setDesconto] = useState(0);
  const [pgto, setPgto] = useState("Pix");

  const itens = carrinho.map((c) => ({ ...produtos.find((p) => p.id === c.id)!, qtd: c.qtd }));
  const subtotal = itens.reduce((s, i) => s + i.precoVenda * i.qtd, 0);
  const total = Math.max(0, subtotal - desconto);
  const lucro = itens.reduce((s, i) => s + (i.precoVenda - i.precoCompra) * i.qtd, 0) - desconto;

  const filtrados = produtos.filter((p) => p.nome.toLowerCase().includes(busca.toLowerCase()));

  const alterar = (id: string, d: number) =>
    setCarrinho((cs) => cs.map((c) => (c.id === id ? { ...c, qtd: Math.max(1, c.qtd + d) } : c)));
  const remover = (id: string) => setCarrinho((cs) => cs.filter((c) => c.id !== id));
  const add = (id: string) =>
    setCarrinho((cs) =>
      cs.some((c) => c.id === id)
        ? cs.map((c) => (c.id === id ? { ...c, qtd: c.qtd + 1 } : c))
        : [...cs, { id, qtd: 1 }],
    );

  return (
    <div className="space-y-5">
      <PendingModuleBanner />
      <PageHeader
        title="Ponto de venda"
        description="Venda rápida com controle de estoque e lucro."
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Produtos</CardTitle>
            <div className="relative w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar produto..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtrados.map((p) => (
              <button
                key={p.id}
                onClick={() => add(p.id)}
                className="group flex flex-col items-start gap-2 rounded-xl border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
              >
                <div className="grid size-full h-24 w-full place-items-center rounded-lg bg-primary-soft text-primary">
                  <Package className="size-8" />
                </div>
                <div className="w-full">
                  <div className="line-clamp-2 text-sm font-semibold">{p.nome}</div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-base font-bold text-primary">{brl(p.precoVenda)}</span>
                    <Badge variant={p.estoque < p.estoqueMinimo ? "destructive" : "outline"}>
                      {p.estoque} un.
                    </Badge>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="sticky top-20 self-start">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="size-5" />
              Carrinho
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg bg-primary-soft/50 p-3 text-sm">
              <User className="size-4 text-primary" />
              <span className="font-medium">Cliente:</span>
              <span className="truncate">{clientes[0].nome}</span>
            </div>

            <div className="space-y-2">
              {itens.length === 0 && (
                <p className="text-center text-sm text-muted-foreground">Carrinho vazio</p>
              )}
              {itens.map((i) => (
                <div key={i.id} className="flex items-center gap-2 rounded-lg border p-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{i.nome}</div>
                    <div className="text-xs text-muted-foreground">{brl(i.precoVenda)} un.</div>
                  </div>
                  <div className="flex items-center gap-1 rounded-md border">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={() => alterar(i.id, -1)}
                    >
                      <Minus className="size-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-semibold">{i.qtd}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={() => alterar(i.id, 1)}
                    >
                      <Plus className="size-3" />
                    </Button>
                  </div>
                  <div className="w-16 text-right text-sm font-semibold">
                    {brl(i.precoVenda * i.qtd)}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-destructive"
                    onClick={() => remover(i.id)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              ))}
            </div>

            <div>
              <Label className="mb-1.5 block text-xs">Desconto</Label>
              <Input
                type="number"
                value={desconto}
                onChange={(e) => setDesconto(Number(e.target.value) || 0)}
              />
            </div>

            <div>
              <Label className="mb-1.5 block text-xs">Forma de pagamento</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {["Pix", "Dinheiro", "Crédito", "Débito", "Cartão", "Dividido"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPgto(p)}
                    className={`rounded-md border px-2 py-2 text-xs font-medium transition-colors ${pgto === p ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1 rounded-lg bg-muted/50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{brl(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Desconto</span>
                <span>- {brl(desconto)}</span>
              </div>
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span className="text-primary">{brl(total)}</span>
              </div>
              <div className="flex justify-between text-xs text-success">
                <span>Lucro estimado</span>
                <span>{brl(lucro)}</span>
              </div>
            </div>

            <Button size="lg" className="w-full" disabled>
              <Receipt />
              Finalização pendente
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Package({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 8.25v7.5l-9 5.25-9-5.25v-7.5L12 3l9 5.25zM3.27 8.25 12 13.5l8.73-5.25M12 22.5V13.5"
      />
    </svg>
  );
}
