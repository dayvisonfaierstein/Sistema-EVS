import { CheckCircle2, Copy, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  provisionAdminOrganization,
  type ProvisionOrganizationInput,
  type ProvisionOrganizationResult,
} from "@/services/platform-admin";

const emptyForm: ProvisionOrganizationInput = {
  legalName: "",
  tradeName: "",
  document: "",
  phone: "",
  email: "",
  city: "",
  state: "",
  adminName: "",
  adminEmail: "",
  delivery: "temporary_password",
};

export function ProvisionOrganizationDialog({ onCreated }: { onCreated(): Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProvisionOrganizationInput>(emptyForm);
  const [result, setResult] = useState<ProvisionOrganizationResult>();
  const [saving, setSaving] = useState(false);

  function change<K extends keyof ProvisionOrganizationInput>(
    key: K,
    value: ProvisionOrganizationInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    setSaving(true);
    try {
      const provisioned = await provisionAdminOrganization(form);
      setResult(provisioned);
      await onCreated();
      toast.success("Espaço e administrador criados.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao cadastrar o Espaço.");
    } finally {
      setSaving(false);
    }
  }

  function close() {
    setOpen(false);
    window.setTimeout(() => {
      setForm(emptyForm);
      setResult(undefined);
    }, 200);
  }

  async function copyAccess() {
    const access = result?.temporaryPassword
      ? `Espaço+: ${result.organizationName}\nAcesso: ${window.location.origin}/login\nE-mail: ${result.adminEmail}\nSenha provisória: ${result.temporaryPassword}\nValidade: ${result.expiresInDays} dias`
      : `Espaço+: ${result?.organizationName}\nAcesso: ${window.location.origin}/login\nE-mail: ${result?.adminEmail}\nUm convite foi enviado por e-mail.`;
    await navigator.clipboard.writeText(access);
    toast.success("Dados de acesso copiados.");
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus />
        Novo Espaço
      </Button>
      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          {result ? (
            <>
              <DialogHeader>
                <div className="mb-2 grid size-12 place-items-center rounded-xl bg-primary-soft text-primary">
                  <CheckCircle2 />
                </div>
                <DialogTitle>Espaço cadastrado com sucesso</DialogTitle>
                <DialogDescription>
                  Estes dados são exibidos uma única vez. Copie-os antes de fechar.
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-xl border bg-muted/30 p-4 text-sm">
                <dl className="grid gap-3 sm:grid-cols-[150px_1fr]">
                  <dt className="text-muted-foreground">Espaço</dt>
                  <dd className="font-semibold">{result.organizationName}</dd>
                  <dt className="text-muted-foreground">Administrador</dt>
                  <dd className="font-semibold">{result.adminEmail}</dd>
                  <dt className="text-muted-foreground">Forma de acesso</dt>
                  <dd>
                    {result.delivery === "invite"
                      ? "Convite enviado por e-mail"
                      : "Senha provisória"}
                  </dd>
                  {result.temporaryPassword && (
                    <>
                      <dt className="text-muted-foreground">Senha provisória</dt>
                      <dd className="break-all rounded-md bg-background px-3 py-2 font-mono font-bold">
                        {result.temporaryPassword}
                      </dd>
                    </>
                  )}
                  <dt className="text-muted-foreground">Validade</dt>
                  <dd>{result.expiresInDays} dias para concluir o primeiro acesso</dd>
                </dl>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                A senha não foi armazenada no banco e não poderá ser consultada novamente. No
                primeiro acesso, o administrador deverá definir uma senha própria.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={close}>
                  Fechar
                </Button>
                <Button onClick={() => void copyAccess()}>
                  <Copy />
                  Copiar dados de acesso
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Cadastrar novo Espaço</DialogTitle>
                <DialogDescription>
                  Crie a organização pendente e o acesso inicial do administrador.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5 py-1">
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold">Dados da organização</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                      label="Razão social"
                      value={form.legalName}
                      onChange={(value) => change("legalName", value)}
                    />
                    <Field
                      label="Nome do Espaço"
                      value={form.tradeName}
                      onChange={(value) => change("tradeName", value)}
                    />
                    <Field
                      label="CPF ou CNPJ"
                      value={form.document ?? ""}
                      onChange={(value) => change("document", value)}
                    />
                    <Field
                      label="Telefone"
                      value={form.phone ?? ""}
                      onChange={(value) => change("phone", value)}
                    />
                    <Field
                      label="E-mail comercial"
                      type="email"
                      value={form.email ?? ""}
                      onChange={(value) => change("email", value)}
                    />
                    <div className="grid grid-cols-[1fr_90px] gap-3">
                      <Field
                        label="Cidade"
                        value={form.city ?? ""}
                        onChange={(value) => change("city", value)}
                      />
                      <Field
                        label="UF"
                        value={form.state ?? ""}
                        maxLength={2}
                        onChange={(value) => change("state", value.toUpperCase())}
                      />
                    </div>
                  </div>
                </section>
                <section className="space-y-3 border-t pt-5">
                  <h3 className="text-sm font-semibold">Administrador principal</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                      label="Nome completo"
                      value={form.adminName}
                      onChange={(value) => change("adminName", value)}
                    />
                    <Field
                      label="E-mail de acesso"
                      type="email"
                      value={form.adminEmail}
                      onChange={(value) => change("adminEmail", value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delivery">Entrega do acesso</Label>
                    <select
                      id="delivery"
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                      value={form.delivery}
                      onChange={(event) =>
                        change(
                          "delivery",
                          event.target.value as ProvisionOrganizationInput["delivery"],
                        )
                      }
                    >
                      <option value="temporary_password">Gerar senha provisória para copiar</option>
                      <option value="invite">Enviar convite pelo Supabase Auth</option>
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Use a senha provisória enquanto o envio automático de e-mail não estiver
                      configurado.
                    </p>
                  </div>
                </section>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={close}>
                  Cancelar
                </Button>
                <Button
                  disabled={
                    saving ||
                    form.legalName.trim().length < 3 ||
                    form.tradeName.trim().length < 2 ||
                    form.adminName.trim().length < 3 ||
                    !form.adminEmail.includes("@")
                  }
                  onClick={() => void submit()}
                >
                  {saving ? "Criando acesso..." : "Cadastrar Espaço"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  maxLength,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  type?: string;
  maxLength?: number;
}) {
  const id = `provision-${label.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
