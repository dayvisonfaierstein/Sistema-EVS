import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ProductPhotoEditor } from "@/components/products/ProductPhotoEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { listProducts } from "@/services/products";
import { recipeTotals, type RecipeInput, type RecipeWithItems } from "@/services/recipes";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });

type Ingredient = { productId: string; quantity: number };

export function RecipeForm({
  recipe,
  existingPhotoUrl,
  submitLabel,
  onSubmit,
}: {
  recipe?: RecipeWithItems;
  existingPhotoUrl?: string | null;
  submitLabel: string;
  onSubmit: (input: RecipeInput, photo: File | null, removeExistingPhoto: boolean) => Promise<void>;
}) {
  const [name, setName] = useState(recipe?.name ?? "");
  const [category, setCategory] = useState(recipe?.category ?? "");
  const [description, setDescription] = useState(recipe?.description ?? "");
  const [salePrice, setSalePrice] = useState(recipe?.sale_price ?? 0);
  const [active, setActive] = useState(recipe?.active ?? true);
  const [notes, setNotes] = useState(recipe?.notes ?? "");
  const [items, setItems] = useState<Ingredient[]>(
    recipe?.recipe_items.map((item) => ({
      productId: item.product_id,
      quantity: item.quantity,
    })) ?? [{ productId: "", quantity: 1 }],
  );
  const [photo, setPhoto] = useState<File | null>(null);
  const [removeExistingPhoto, setRemoveExistingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const products = useQuery({
    queryKey: ["products", { active: "active" }],
    queryFn: () => listProducts({ active: "active" }),
  });

  const calculatedRecipe = useMemo(
    () => ({
      sale_price: salePrice,
      recipe_items: items.map((item, index) => ({
        id: `draft-${index}`,
        organization_id: "",
        recipe_id: recipe?.id ?? "",
        product_id: item.productId,
        quantity: item.quantity,
        unit:
          products.data?.find((product) => product.id === item.productId)?.consumption_unit ?? "",
        sort_order: index,
        created_at: "",
        updated_at: "",
        products: products.data?.find((product) => product.id === item.productId) ?? null,
      })),
    }),
    [items, products.data, recipe?.id, salePrice],
  );
  const totals = recipeTotals(calculatedRecipe);

  const updateItem = (index: number, patch: Partial<Ingredient>) =>
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const validItems = items.filter((item) => item.productId && item.quantity > 0);
    if (name.trim().length < 2) return toast.error("Informe o nome da preparação.");
    if (!validItems.length) return toast.error("Adicione pelo menos um ingrediente.");
    if (validItems.length !== items.length)
      return toast.error("Preencha corretamente todos os ingredientes.");
    if (new Set(validItems.map((item) => item.productId)).size !== validItems.length)
      return toast.error("O mesmo produto não pode ser adicionado duas vezes.");
    if (!Number.isFinite(salePrice) || salePrice < 0)
      return toast.error("Informe um preço de venda válido.");

    setSubmitting(true);
    try {
      await onSubmit(
        {
          name,
          category,
          description,
          salePrice,
          active,
          notes,
          items: validItems,
        },
        photo,
        removeExistingPhoto,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Foto da preparação</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductPhotoEditor
            value={photo}
            existingUrl={removeExistingPhoto ? null : existingPhotoUrl}
            entityLabel="preparação"
            onChange={(file) => {
              setPhoto(file);
              if (file) setRemoveExistingPhoto(false);
            }}
            onRemove={() => {
              setPhoto(null);
              setRemoveExistingPhoto(Boolean(existingPhotoUrl));
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Identificação</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Nome da preparação" required>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Categoria">
            <Input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Ex.: Shake, Chá ou Combo"
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Descrição">
              <Textarea
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Ingredientes</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Informe a quantidade realmente utilizada em cada preparo.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setItems((current) => [...current, { productId: "", quantity: 1 }])}
          >
            <Plus />
            Ingrediente
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item, index) => {
            const product = products.data?.find((candidate) => candidate.id === item.productId);
            const ingredientRecipe = {
              sale_price: 0,
              recipe_items: calculatedRecipe.recipe_items.filter(
                (_, itemIndex) => itemIndex === index,
              ),
            };
            const ingredientTotals = recipeTotals(ingredientRecipe);
            return (
              <div
                key={`${index}-${item.productId}`}
                className="grid gap-3 rounded-xl border p-3 md:grid-cols-[1fr_180px_auto]"
              >
                <Select
                  value={item.productId}
                  onValueChange={(value) => updateItem(index, { productId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {(products.data ?? []).map((candidate) => (
                      <SelectItem key={candidate.id} value={candidate.id}>
                        {candidate.name} {candidate.sku ? `• ${candidate.sku}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div>
                  <div className="flex items-center">
                    <Input
                      type="number"
                      min="0.000001"
                      step="any"
                      value={item.quantity}
                      onChange={(event) =>
                        updateItem(index, { quantity: Number(event.target.value) })
                      }
                    />
                    <span className="ml-2 min-w-10 text-sm text-muted-foreground">
                      {product?.consumption_unit ?? ""}
                    </span>
                  </div>
                  {product && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {money.format(ingredientTotals.cost)} • {number.format(ingredientTotals.pv)}{" "}
                      PV
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Remover ingrediente"
                  disabled={items.length === 1}
                  onClick={() =>
                    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))
                  }
                >
                  <Trash2 />
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preço e resultado estimado</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Field label="Preço de venda">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={salePrice}
              onChange={(event) => setSalePrice(Number(event.target.value))}
            />
          </Field>
          <Summary label="Custo do preparo" value={money.format(totals.cost)} />
          <Summary label="PV do preparo" value={number.format(totals.pv)} />
          <Summary label="Lucro bruto" value={money.format(totals.profit)} />
          <Summary label="Margem" value={`${number.format(totals.margin)}%`} />
          <div className="md:col-span-2 lg:col-span-5">
            <Field label="Observações">
              <Textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
            </Field>
          </div>
          <label className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm md:col-span-2">
            Preparação ativa
            <Switch checked={active} onCheckedChange={setActive} />
          </label>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? <LoaderCircle className="animate-spin" /> : <Check />}
          {submitting ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1.5 block">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}
