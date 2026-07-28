import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Clock,
  Package,
  Plus,
  Scale,
  Wallet,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, StatCard } from "@/components/layout/PageChrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";
import {
  listExpiringBatches,
  listInventoryMovements,
  registerInventoryMovement,
  type InventoryMovementInput,
  type InventoryMovementType,
} from "@/services/inventory";
import { listProducts } from "@/services/products";

export const Route = createFileRoute("/_app/estoque")({
  head: () => ({ meta: [{ title: "Estoque — Espaço+" }] }),
  component: InventoryPage,
});

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });

const movementLabels: Record<
  InventoryMovementType,
  { label: string; direction: "entry" | "exit" }
> = {
  purchase: { label: "Compra", direction: "entry" },
  positive_adjustment: { label: "Ajuste positivo", direction: "entry" },
  return: { label: "Devolução", direction: "entry" },
  consumption: { label: "Consumo", direction: "exit" },
  sale: { label: "Venda", direction: "exit" },
  loss: { label: "Perda", direction: "exit" },
  expiration: { label: "Vencimento", direction: "exit" },
  negative_adjustment: { label: "Ajuste negativo", direction: "exit" },
};

const initialForm: InventoryMovementInput = {
  productId: "",
  movementType: "purchase",
  quantity: 1,
  quantityMode: "package",
  reason: "Compra de produto",
  notes: "",
  unitCost: null,
  batchNumber: "",
  manufactureDate: "",
  expirationDate: "",
};

function InventoryPage() {
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<InventoryMovementInput>(initialForm);
  const products = useQuery({
    queryKey: ["products", { active: "active" }],
    queryFn: () => listProducts({ active: "active" }),
  });
  const movements = useQuery({
    queryKey: ["inventory-movements"],
    queryFn: () => listInventoryMovements(),
  });
  const expiringBatches = useQuery({
    queryKey: ["inventory-expiring-batches", 60],
    queryFn: () => listExpiringBatches(60),
  });
  const selectedProduct = products.data?.find((product) => product.id === form.productId);
  const selectedMovement = movementLabels[form.movementType];
  const canManageInventory = can("manager", "inventory");

  const stats = useMemo(() => {
    const catalog = products.data ?? [];
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const monthMovements = (movements.data ?? []).filter(
      (movement) => new Date(movement.created_at) >= startOfMonth,
    );

    return {
      products: catalog.length,
      value: catalog.reduce(
        (total, product) => total + product.current_stock * product.average_cost,
        0,
      ),
      low: catalog.filter(
        (product) => product.current_stock > 0 && product.current_stock <= product.minimum_stock,
      ).length,
      out: catalog.filter((product) => product.current_stock <= 0).length,
      entries: monthMovements.filter(
        (movement) =>
          movementLabels[movement.movement_type as InventoryMovementType]?.direction === "entry",
      ).length,
      exits: monthMovements.filter(
        (movement) =>
          movementLabels[movement.movement_type as InventoryMovementType]?.direction === "exit",
      ).length,
      losses: monthMovements.filter((movement) =>
        ["loss", "expiration"].includes(movement.movement_type),
      ).length,
    };
  }, [movements.data, products.data]);

  const saveMovement = useMutation({
    mutationFn: registerInventoryMovement,
    onSuccess: (result) => {
      toast.success(`Movimentação registrada. Novo saldo: ${number.format(result.new_balance)}.`);
      setDialogOpen(false);
      setForm(initialForm);
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
      void queryClient.invalidateQueries({ queryKey: ["inventory-expiring-batches"] });
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Não foi possível movimentar o estoque.",
      ),
  });

  const setField = <K extends keyof InventoryMovementInput>(
    key: K,
    value: InventoryMovementInput[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const changeMovementType = (value: InventoryMovementType) => {
    const label = movementLabels[value].label;
    setForm((current) => ({
      ...current,
      movementType: value,
      reason: label,
      unitCost: value === "purchase" ? current.unitCost : null,
    }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.productId) return toast.error("Selecione o produto.");
    if (!Number.isFinite(form.quantity) || form.quantity <= 0)
      return toast.error("Informe uma quantidade válida.");
    if (!form.reason.trim()) return toast.error("Informe o motivo.");
    if (
      form.quantityMode === "package" &&
      (!selectedProduct?.package_content || selectedProduct.package_content <= 0)
    )
      return toast.error("Este produto não possui conteúdo da embalagem cadastrado.");
    if (form.manufactureDate && form.expirationDate && form.manufactureDate > form.expirationDate)
      return toast.error("A validade não pode ser anterior à fabricação.");
    saveMovement.mutate(form);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Estoque"
        description="Entradas, saídas, perdas, lotes e histórico completo."
        actions={
          canManageInventory ? (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus />
              Nova movimentação
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard title="Produtos ativos" value={stats.products} icon={Package} />
        <StatCard
          title="Valor em estoque"
          value={money.format(stats.value)}
          icon={Wallet}
          tone="info"
        />
        <StatCard title="Estoque baixo" value={stats.low} icon={AlertTriangle} tone="warning" />
        <StatCard title="Sem estoque" value={stats.out} icon={XCircle} tone="destructive" />
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          title="Entradas no mês"
          value={stats.entries}
          hint="movimentações"
          icon={ArrowDown}
          tone="success"
        />
        <StatCard
          title="Saídas no mês"
          value={stats.exits}
          hint="movimentações"
          icon={ArrowUp}
          tone="info"
        />
        <StatCard
          title="Perdas no mês"
          value={stats.losses}
          hint="perdas e vencimentos"
          icon={Scale}
          tone="destructive"
        />
        <StatCard
          title="Próx. vencimento"
          value={expiringBatches.data?.length ?? 0}
          hint="nos próximos 60 dias"
          icon={Clock}
          tone="warning"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Movimentações recentes</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data e hora</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Movimentação</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(movements.isLoading || movements.isError || movements.data?.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="h-28 text-center text-muted-foreground">
                    {movements.isLoading
                      ? "Carregando movimentações..."
                      : movements.isError
                        ? "Não foi possível carregar o histórico."
                        : "Nenhuma movimentação registrada."}
                  </TableCell>
                </TableRow>
              )}
              {movements.data?.map((movement) => {
                const type = movementLabels[movement.movement_type as InventoryMovementType];
                const isEntry = type?.direction === "entry";
                return (
                  <TableRow key={movement.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(movement.created_at).toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{movement.products?.name ?? "Produto"}</div>
                      <div className="text-xs text-muted-foreground">
                        {movement.products?.sku || "Sem SKU"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          isEntry
                            ? "border-success/30 bg-success/10 text-success"
                            : movement.movement_type === "loss" ||
                                movement.movement_type === "expiration"
                              ? "border-destructive/30 bg-destructive/10 text-destructive"
                              : "border-info/30 bg-info/10 text-info"
                        }
                      >
                        {type?.label ?? movement.movement_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {isEntry ? "+" : "−"}
                      {number.format(movement.quantity)}{" "}
                      <span className="text-xs text-muted-foreground">
                        {movement.unit || movement.products?.consumption_unit}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>{movement.reason || "—"}</div>
                      {movement.notes && (
                        <div className="max-w-64 truncate text-xs text-muted-foreground">
                          {movement.notes}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{movement.profiles?.full_name ?? "Sistema"}</TableCell>
                    <TableCell className="whitespace-nowrap text-right font-semibold">
                      {number.format(movement.new_balance)} {movement.unit}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-2xl">
          <form onSubmit={submit} className="space-y-5">
            <DialogHeader>
              <DialogTitle>Nova movimentação de estoque</DialogTitle>
              <DialogDescription>
                O saldo e o histórico serão atualizados juntos de forma segura.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Produto" className="sm:col-span-2">
                <Select
                  value={form.productId}
                  onValueChange={(value) => setField("productId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {(products.data ?? []).map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} {product.sku ? `• ${product.sku}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Tipo de movimentação">
                <Select
                  value={form.movementType}
                  onValueChange={(value) => changeMovementType(value as InventoryMovementType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase">Entrada • Compra</SelectItem>
                    <SelectItem value="positive_adjustment">Entrada • Ajuste positivo</SelectItem>
                    <SelectItem value="return">Entrada • Devolução</SelectItem>
                    <SelectItem value="consumption">Saída • Consumo</SelectItem>
                    <SelectItem value="sale">Saída • Venda</SelectItem>
                    <SelectItem value="loss">Saída • Perda</SelectItem>
                    <SelectItem value="expiration">Saída • Vencimento</SelectItem>
                    <SelectItem value="negative_adjustment">Saída • Ajuste negativo</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Lançar a quantidade em">
                <Select
                  value={form.quantityMode}
                  onValueChange={(value) =>
                    setField("quantityMode", value as "package" | "consumption")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="package">
                      Embalagem ({selectedProduct?.stock_unit ?? "unidade"})
                    </SelectItem>
                    <SelectItem value="consumption">
                      Consumo ({selectedProduct?.consumption_unit ?? "unidade"})
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field
                label={`Quantidade (${form.quantityMode === "package" ? selectedProduct?.stock_unit || "embalagens" : selectedProduct?.consumption_unit || "unidades"})`}
              >
                <Input
                  type="number"
                  min="0.000001"
                  step="any"
                  value={form.quantity}
                  onChange={(event) => setField("quantity", Number(event.target.value))}
                />
              </Field>

              <Field label="Motivo">
                <Input
                  value={form.reason}
                  onChange={(event) => setField("reason", event.target.value)}
                  placeholder="Ex.: compra mensal"
                />
              </Field>

              {selectedProduct && (
                <div className="rounded-xl border bg-muted/30 p-3 text-sm sm:col-span-2">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span>
                      Saldo atual:{" "}
                      <strong>
                        {number.format(selectedProduct.current_stock)}{" "}
                        {selectedProduct.consumption_unit}
                      </strong>
                    </span>
                    {form.quantityMode === "package" && selectedProduct.package_content && (
                      <span className="text-muted-foreground">
                        {number.format(form.quantity)} {selectedProduct.stock_unit} ={" "}
                        {number.format(form.quantity * selectedProduct.package_content)}{" "}
                        {selectedProduct.consumption_unit}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {selectedMovement.direction === "entry" && (
              <div className="space-y-4 rounded-xl border p-4">
                <div>
                  <h3 className="font-semibold">Compra e lote</h3>
                  <p className="text-xs text-muted-foreground">
                    Os dados do lote são opcionais. Preencha-os para acompanhar a validade.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label={
                      form.quantityMode === "package"
                        ? "Custo por embalagem"
                        : `Custo por ${selectedProduct?.consumption_unit || "unidade"}`
                    }
                  >
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.unitCost ?? ""}
                      onChange={(event) =>
                        setField(
                          "unitCost",
                          event.target.value === "" ? null : Number(event.target.value),
                        )
                      }
                      placeholder="Opcional"
                    />
                  </Field>
                  <Field label="Número do lote">
                    <Input
                      value={form.batchNumber}
                      onChange={(event) => setField("batchNumber", event.target.value)}
                      placeholder="Opcional"
                    />
                  </Field>
                  <Field label="Data de fabricação">
                    <Input
                      type="date"
                      value={form.manufactureDate}
                      onChange={(event) => setField("manufactureDate", event.target.value)}
                    />
                  </Field>
                  <Field label="Data de validade">
                    <Input
                      type="date"
                      value={form.expirationDate}
                      onChange={(event) => setField("expirationDate", event.target.value)}
                    />
                  </Field>
                </div>
              </div>
            )}

            <Field label="Observações">
              <Textarea
                value={form.notes}
                onChange={(event) => setField("notes", event.target.value)}
                placeholder="Informações adicionais sobre esta movimentação"
              />
            </Field>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMovement.isPending}>
                {saveMovement.isPending ? "Registrando..." : "Confirmar movimentação"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="mb-2 block">{label}</Label>
      {children}
    </div>
  );
}
