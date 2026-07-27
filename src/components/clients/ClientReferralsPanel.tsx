import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, UserRoundPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createReferral, listReferrals } from "@/services/assessments";

export function ClientReferralsPanel({ clientId }: { clientId: string }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    city: "",
    relationship: "",
    notes: "",
  });
  const referrals = useQuery({
    queryKey: ["client-referrals", clientId],
    queryFn: () => listReferrals(clientId),
  });
  async function save() {
    if (!form.name.trim()) return toast.error("Informe o nome da indicação.");
    setSaving(true);
    try {
      await createReferral(clientId, {
        name: form.name.trim(),
        phone: form.phone || null,
        city: form.city || null,
        relationship: form.relationship || null,
        notes: form.notes || null,
      });
      setForm({ name: "", phone: "", city: "", relationship: "", notes: "" });
      await queryClient.invalidateQueries({ queryKey: ["client-referrals", clientId] });
      toast.success("Indicação vinculada ao cliente.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar indicação.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserRoundPlus className="size-5 text-primary" />
            Nova indicação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            ["name", "Nome"],
            ["phone", "Telefone"],
            ["city", "Cidade"],
            ["relationship", "Relação com o cliente"],
          ].map(([key, label]) => (
            <div key={key}>
              <Label className="mb-1 block">{label}</Label>
              <Input
                value={form[key as keyof typeof form]}
                onChange={(event) =>
                  setForm((current) => ({ ...current, [key]: event.target.value }))
                }
              />
            </div>
          ))}
          <div>
            <Label className="mb-1 block">Observações</Label>
            <Textarea
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
            />
          </div>
          <Button className="w-full" onClick={save} disabled={saving}>
            <Plus />
            Salvar indicação
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Indicações registradas</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {referrals.data?.map((referral) => (
            <div key={referral.id} className="grid gap-1 py-3 sm:grid-cols-3">
              <strong>{referral.name}</strong>
              <span className="text-sm text-muted-foreground">
                {referral.phone || "Sem telefone"}
              </span>
              <span className="text-sm text-muted-foreground">
                {[referral.city, referral.relationship].filter(Boolean).join(" · ") || "—"}
              </span>
            </div>
          ))}
          {!referrals.data?.length && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma indicação registrada.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
