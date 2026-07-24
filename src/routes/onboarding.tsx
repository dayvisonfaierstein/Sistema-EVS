import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({ component: OrganizationOnboarding });
function OrganizationOnboarding() {
  const { session, profile } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    legalName: "",
    tradeName: "",
    document: "",
    phone: "",
    email: session?.user.email ?? "",
  });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (profile) nav({ to: "/dashboard" });
  }, [nav, profile]);
  if (!session)
    return (
      <div className="grid min-h-screen place-items-center">
        <Button onClick={() => nav({ to: "/login" })}>Entrar primeiro</Button>
      </div>
    );
  if (profile) return null;
  async function save() {
    if (form.legalName.length < 3 || form.tradeName.length < 2)
      return toast.error("Informe razão social e nome do espaço.");
    setSaving(true);
    try {
      const { error } = await getSupabase().rpc("bootstrap_organization", {
        p_legal_name: form.legalName,
        p_trade_name: form.tradeName,
        p_document: form.document || null,
        p_phone: form.phone || null,
        p_email: form.email || null,
      });
      if (error) throw error;
      toast.success("Organização criada. Entre novamente para carregar seu perfil.");
      await getSupabase().auth.refreshSession();
      nav({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao criar organização.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <div className="mb-3 grid size-12 place-items-center rounded-xl bg-primary-soft text-primary">
            <Building2 />
          </div>
          <CardTitle>Cadastre seu Espaço Vida Saudável</CardTitle>
          <p className="text-sm text-muted-foreground">
            Esta será sua organização isolada no Espaço+.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["legalName", "Razão social"],
              ["tradeName", "Nome do espaço"],
              ["document", "CNPJ/CPF"],
              ["phone", "Telefone"],
              ["email", "E-mail"],
            ] as const
          ).map(([key, label]) => (
            <div
              key={key}
              className={key === "legalName" || key === "tradeName" ? "sm:col-span-2" : ""}
            >
              <Label className="mb-1.5 block">{label}</Label>
              <Input
                value={form[key]}
                onChange={(e) => setForm((v) => ({ ...v, [key]: e.target.value }))}
              />
            </div>
          ))}
          <Button className="sm:col-span-2" onClick={save} disabled={saving}>
            <Check />
            {saving ? "Criando..." : "Criar organização"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
