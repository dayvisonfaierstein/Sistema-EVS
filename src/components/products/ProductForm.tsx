import { useState } from "react";
import { Controller, useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, LoaderCircle, Plus, Settings2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import {
  createProductCategory,
  listProductCategories,
  setProductCategoryActive,
  type ProductInput,
} from "@/services/products";
import type { Product } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const decimalText = z
  .string()
  .refine(
    (value) => value.trim() === "" || (!Number.isNaN(Number(value)) && Number(value) >= 0),
    "Informe um valor válido.",
  );

const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome do produto."),
  sku: z.string(),
  barcode: z.string(),
  brand: z.string(),
  category_id: z.string(),
  subcategory: z.string(),
  description: z.string(),
  package_content: decimalText,
  content_unit: z.string(),
  stock_unit: z.string().min(1, "Informe a unidade de estoque."),
  consumption_unit: z.string().min(1, "Informe a unidade de consumo."),
  volume_points: decimalText,
  cost_price: decimalText,
  sale_price: decimalText,
  minimum_stock: decimalText,
  verification_status: z.enum(["pending", "verified", "updated"]),
  track_batches: z.boolean(),
  active: z.boolean(),
  notes: z.string(),
});

export type ProductFormValues = z.infer<typeof schema>;

const units = [
  ["unit", "Unidade"],
  ["g", "Grama (g)"],
  ["kg", "Quilograma (kg)"],
  ["ml", "Mililitro (ml)"],
  ["l", "Litro (l)"],
  ["serving", "Porção"],
  ["package", "Embalagem"],
  ["pot", "Pote"],
  ["bottle", "Frasco"],
  ["box", "Caixa"],
  ["sachet", "Sachê"],
] as const;

function textOrNull(value: string) {
  return value.trim() || null;
}

function numberOrZero(value: string) {
  return value.trim() ? Number(value) : 0;
}

function numberOrNull(value: string) {
  return value.trim() ? Number(value) : null;
}

// eslint-disable-next-line react-refresh/only-export-components
export function productFormValuesToInput(values: ProductFormValues): ProductInput {
  return {
    category_id: values.category_id || null,
    name: values.name,
    description: textOrNull(values.description),
    brand: textOrNull(values.brand),
    subcategory: textOrNull(values.subcategory),
    sku: textOrNull(values.sku),
    barcode: textOrNull(values.barcode),
    package_content: numberOrNull(values.package_content),
    content_unit: values.content_unit || null,
    stock_unit: values.stock_unit,
    consumption_unit: values.consumption_unit,
    volume_points: numberOrNull(values.volume_points),
    cost_price: numberOrZero(values.cost_price),
    sale_price: numberOrZero(values.sale_price),
    minimum_stock: numberOrZero(values.minimum_stock),
    track_batches: values.track_batches,
    active: values.active,
    notes: textOrNull(values.notes),
    verification_status: values.verification_status,
  };
}

function initialValues(product?: Product): ProductFormValues {
  return {
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    barcode: product?.barcode ?? "",
    brand: product?.brand ?? "Herbalife",
    category_id: product?.category_id ?? "",
    subcategory: product?.subcategory ?? "",
    description: product?.description ?? "",
    package_content: product?.package_content?.toString() ?? "",
    content_unit: product?.content_unit ?? "g",
    stock_unit: product?.stock_unit ?? "pot",
    consumption_unit: product?.consumption_unit ?? "g",
    volume_points: product?.volume_points?.toString() ?? "",
    cost_price: product?.cost_price?.toString() ?? "",
    sale_price: product?.sale_price?.toString() ?? "",
    minimum_stock: product?.minimum_stock?.toString() ?? "",
    verification_status: product?.verification_status ?? "pending",
    track_batches: product?.track_batches ?? true,
    active: product?.active ?? true,
    notes: product?.notes ?? "",
  };
}

export function ProductForm({
  product,
  submitLabel,
  onSubmit,
}: {
  product?: Product;
  submitLabel: string;
  onSubmit: (values: ProductFormValues) => Promise<void>;
}) {
  const categories = useQuery({
    queryKey: ["product-categories", "active"],
    queryFn: () => listProductCategories(),
  });
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues(product),
  });

  const field = (
    name: keyof ProductFormValues,
    label: string,
    options?: { type?: string; required?: boolean; placeholder?: string },
  ) => (
    <div>
      <Label htmlFor={name} className="mb-1.5 block">
        {label}
        {options?.required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      <Input
        id={name}
        type={options?.type ?? "text"}
        step={options?.type === "number" ? "0.000001" : undefined}
        min={options?.type === "number" ? "0" : undefined}
        placeholder={options?.placeholder}
        {...register(name)}
      />
      {errors[name] && <p className="mt-1 text-xs text-destructive">{errors[name]?.message}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Identificação</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            {field("name", "Nome do produto", { required: true })}
          </div>
          {field("sku", "SKU", { placeholder: "Ex.: 0951 ou 059K" })}
          {field("barcode", "Código de barras")}
          {field("brand", "Marca")}
          {field("subcategory", "Subcategoria")}
          <div className="md:col-span-2">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <Label>Categoria</Label>
              <CategoryManager
                onCategoryCreated={(categoryId) =>
                  setValue("category_id", categoryId, { shouldDirty: true })
                }
              />
            </div>
            <Controller
              control={control}
              name="category_id"
              render={({ field: categoryField }) => (
                <Select
                  value={categoryField.value || "none"}
                  onValueChange={(value) => categoryField.onChange(value === "none" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {(categories.data ?? []).map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="description" className="mb-1.5 block">
              Descrição
            </Label>
            <Textarea id="description" rows={3} {...register("description")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Embalagem e unidades</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {field("package_content", "Conteúdo total", {
            type: "number",
            placeholder: "Ex.: 550",
          })}
          <UnitSelect control={control} name="content_unit" label="Unidade do conteúdo" />
          <UnitSelect control={control} name="stock_unit" label="Unidade de estoque" />
          <UnitSelect control={control} name="consumption_unit" label="Unidade de consumo" />
          <p className="md:col-span-2 text-xs text-muted-foreground">
            Exemplo: um pote com 550 g entra como “pote”, mas o saldo interno e o consumo são
            controlados em gramas.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Valores e controle</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {field("volume_points", "Pontos de Volume (PV)", { type: "number" })}
          {field("cost_price", "Custo de referência (R$)", { type: "number" })}
          {field("sale_price", "Preço sugerido de venda (R$)", { type: "number" })}
          {field("minimum_stock", "Estoque mínimo", { type: "number" })}
          <div>
            <Label className="mb-1.5 block">Conferência dos dados</Label>
            <Controller
              control={control}
              name="verification_status"
              render={({ field: verificationField }) => (
                <Select value={verificationField.value} onValueChange={verificationField.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="verified">Conferido</SelectItem>
                    <SelectItem value="updated">Atualizado</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="flex flex-col justify-end gap-3 pb-1">
            <Controller
              control={control}
              name="track_batches"
              render={({ field: batchField }) => (
                <label className="flex items-center justify-between gap-3 text-sm">
                  Controlar lotes e validade
                  <Switch checked={batchField.value} onCheckedChange={batchField.onChange} />
                </label>
              )}
            />
            <Controller
              control={control}
              name="active"
              render={({ field: activeField }) => (
                <label className="flex items-center justify-between gap-3 text-sm">
                  Produto ativo
                  <Switch checked={activeField.value} onCheckedChange={activeField.onChange} />
                </label>
              )}
            />
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <Label htmlFor="notes" className="mb-1.5 block">
              Observações
            </Label>
            <Textarea id="notes" rows={3} {...register("notes")} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <LoaderCircle className="animate-spin" /> : <Check />}
          {isSubmitting ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function UnitSelect({
  control,
  name,
  label,
}: {
  control: Control<ProductFormValues>;
  name: "content_unit" | "stock_unit" | "consumption_unit";
  label: string;
}) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {units.map(([value, unitLabel]) => (
                <SelectItem key={value} value={value}>
                  {unitLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </div>
  );
}

function CategoryManager({ onCategoryCreated }: { onCategoryCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const queryClient = useQueryClient();
  const categories = useQuery({
    queryKey: ["product-categories", "all"],
    queryFn: () => listProductCategories(true),
    enabled: open,
  });
  const createCategory = useMutation({
    mutationFn: () => createProductCategory({ name }),
    onSuccess: async (category) => {
      setName("");
      onCategoryCreated(category.id);
      await queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      toast.success("Categoria criada com sucesso.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível criar a categoria."),
  });
  const toggleCategory = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      setProductCategoryActive(id, active),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["product-categories"] });
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Não foi possível atualizar a categoria.",
      ),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm">
          <Settings2 />
          Gerenciar categorias
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Categorias de produtos</DialogTitle>
          <DialogDescription>
            Crie categorias novas ou desative as que não devem aparecer nos cadastros.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome da nova categoria"
          />
          <Button
            type="button"
            onClick={() => createCategory.mutate()}
            disabled={name.trim().length < 2 || createCategory.isPending}
          >
            <Plus />
            Adicionar
          </Button>
        </div>
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {(categories.data ?? []).map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div>
                <div className="text-sm font-medium">{category.name}</div>
                <div className="text-xs text-muted-foreground">
                  {category.active ? "Ativa" : "Inativa"}
                </div>
              </div>
              <Switch
                checked={category.active}
                onCheckedChange={(active) => toggleCategory.mutate({ id: category.id, active })}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
