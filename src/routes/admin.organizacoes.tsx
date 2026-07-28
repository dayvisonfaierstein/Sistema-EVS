import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Pencil, Save, Search } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageChrome";
import { ProvisionOrganizationDialog } from "@/components/admin/ProvisionOrganizationDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  listAdminOrganizations,
  updateAdminOrganization,
  type AdminOrganizationInput,
} from "@/services/platform-admin";
import type { Organization, OrganizationStatus } from "@/types/database";

export const Route = createFileRoute("/admin/organizacoes")({
  head: () => ({ meta: [{ title: "Organizações — Espaço+ Admin" }] }),
  component: OrganizationsPage,
});

const statusLabels: Record<OrganizationStatus, string> = {
  pending: "Pendente",
  trial: "Período de teste",
  active: "Ativa",
  grace_period: "Carência",
  blocked: "Bloqueada",
  cancelled: "Cancelada",
  inactive: "Inativa",
};

function OrganizationsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Organization | null>(null);
  const query = useQuery({
    queryKey: ["admin-organizations"],
    queryFn: listAdminOrganizations,
  });
  const organizations = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if (!term) return query.data ?? [];
    return (query.data ?? []).filter((organization) =>
      [
        organization.trade_name,
        organization.legal_name,
        organization.document,
        organization.city,
        organization.email,
      ].some((value) => value?.toLocaleLowerCase("pt-BR").includes(term)),
    );
  }, [query.data, search]);
  const updateMutation = useMutation({
    mutationFn: (input: AdminOrganizationInput) =>
      updateAdminOrganization(editing?.id ?? "", input),
    onSuccess: async () => {
      toast.success("Organização atualizada.");
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div>
      <PageHeader
        title="Organizações"
        description="Todos os espaços cadastrados na plataforma e suas situações atuais."
        actions={
          <ProvisionOrganizationDialog
            onCreated={async () => {
              await query.refetch();
            }}
          />
        }
      />
      <Card>
        <CardContent className="p-0">
          <div className="border-b p-4">
            <div className="relative max-w-lg">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por espaço, documento, cidade ou e-mail..."
                className="pl-9"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Organização</th>
                  <th className="px-4 py-3">Localização</th>
                  <th className="px-4 py-3">Contato</th>
                  <th className="px-4 py-3">Situação</th>
                  <th className="px-4 py-3">Cadastro</th>
                  <th className="w-20 px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {organizations.map((organization) => (
                  <tr key={organization.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                          <Building2 className="size-4" />
                        </div>
                        <div>
                          <div className="font-semibold">{organization.trade_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {organization.document || organization.legal_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {[organization.city, organization.state].filter(Boolean).join(" / ") || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div>{organization.email || "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {organization.whatsapp || organization.phone}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={organization.status === "active" ? "default" : "outline"}>
                        {statusLabels[organization.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(organization.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" size="sm" onClick={() => setEditing(organization)}>
                        <Pencil />
                        Editar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!query.isLoading && !organizations.length && (
            <p className="p-10 text-center text-sm text-muted-foreground">
              Nenhuma organização encontrada.
            </p>
          )}
          {query.isLoading && (
            <p className="p-10 text-center text-sm text-muted-foreground">
              Carregando organizações...
            </p>
          )}
        </CardContent>
      </Card>
      <EditOrganizationDialog
        organization={editing}
        saving={updateMutation.isPending}
        onClose={() => setEditing(null)}
        onSave={(input) => updateMutation.mutate(input)}
      />
    </div>
  );
}

const emptyInput: AdminOrganizationInput = {
  legal_name: "",
  trade_name: "",
  document: "",
  legal_document_type: "CNPJ",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  address_number: "",
  address_complement: "",
  neighborhood: "",
  city: "",
  state: "",
  postal_code: "",
  responsible_name: "",
  responsible_phone: "",
  responsible_whatsapp: "",
  responsible_email: "",
};

function organizationInput(organization: Organization | null): AdminOrganizationInput {
  if (!organization) return emptyInput;
  return {
    legal_name: organization.legal_name,
    trade_name: organization.trade_name,
    document: organization.document ?? "",
    legal_document_type: organization.legal_document_type ?? "CNPJ",
    phone: organization.phone ?? "",
    whatsapp: organization.whatsapp ?? "",
    email: organization.email ?? "",
    address: organization.address ?? "",
    address_number: organization.address_number ?? "",
    address_complement: organization.address_complement ?? "",
    neighborhood: organization.neighborhood ?? "",
    city: organization.city ?? "",
    state: organization.state ?? "",
    postal_code: organization.postal_code ?? "",
    responsible_name: organization.responsible_name ?? "",
    responsible_phone: organization.responsible_phone ?? "",
    responsible_whatsapp: organization.responsible_whatsapp ?? "",
    responsible_email: organization.responsible_email ?? "",
  };
}

function EditOrganizationDialog({
  organization,
  saving,
  onClose,
  onSave,
}: {
  organization: Organization | null;
  saving: boolean;
  onClose(): void;
  onSave(input: AdminOrganizationInput): void;
}) {
  const [form, setForm] = useState<AdminOrganizationInput>(emptyInput);
  const [error, setError] = useState<string | null>(null);

  function openChanged(open: boolean) {
    if (!open) onClose();
  }

  function setField(key: keyof AdminOrganizationInput, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit() {
    setError(null);
    if (form.trade_name.trim().length < 2) {
      setError("Informe o nome fantasia.");
      return;
    }
    if (form.legal_name.trim().length < 2) {
      setError("Informe a razão social.");
      return;
    }
    if (form.state && form.state.trim().length !== 2) {
      setError("Informe a UF com duas letras.");
      return;
    }
    onSave(form);
  }

  return (
    <Dialog
      open={Boolean(organization)}
      onOpenChange={(open) => {
        if (open && organization) {
          setForm(organizationInput(organization));
          setError(null);
        }
        openChanged(open);
      }}
    >
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"
        onOpenAutoFocus={() => {
          setForm(organizationInput(organization));
          setError(null);
        }}
      >
        <DialogHeader>
          <DialogTitle>Editar organização</DialogTitle>
          <DialogDescription>
            Atualize os dados cadastrais do Espaço. Plano, cobrança e situação continuam na área de
            assinaturas.
          </DialogDescription>
        </DialogHeader>

        <FormSection title="Identificação">
          <Field
            label="Nome fantasia *"
            value={form.trade_name}
            onChange={(value) => setField("trade_name", value)}
          />
          <Field
            label="Razão social *"
            value={form.legal_name}
            onChange={(value) => setField("legal_name", value)}
          />
          <Field
            label="CNPJ ou CPF"
            value={form.document ?? ""}
            onChange={(value) => setField("document", value)}
          />
          <Field
            label="Tipo de documento"
            value={form.legal_document_type ?? ""}
            onChange={(value) => setField("legal_document_type", value)}
          />
        </FormSection>

        <FormSection title="Contatos">
          <Field
            label="E-mail"
            type="email"
            value={form.email ?? ""}
            onChange={(value) => setField("email", value)}
          />
          <Field
            label="Telefone"
            value={form.phone ?? ""}
            onChange={(value) => setField("phone", value)}
          />
          <Field
            label="WhatsApp"
            value={form.whatsapp ?? ""}
            onChange={(value) => setField("whatsapp", value)}
          />
        </FormSection>

        <FormSection title="Endereço">
          <div className="sm:col-span-2">
            <Field
              label="Endereço"
              value={form.address ?? ""}
              onChange={(value) => setField("address", value)}
            />
          </div>
          <Field
            label="Número"
            value={form.address_number ?? ""}
            onChange={(value) => setField("address_number", value)}
          />
          <Field
            label="Complemento"
            value={form.address_complement ?? ""}
            onChange={(value) => setField("address_complement", value)}
          />
          <Field
            label="Bairro"
            value={form.neighborhood ?? ""}
            onChange={(value) => setField("neighborhood", value)}
          />
          <Field
            label="CEP"
            value={form.postal_code ?? ""}
            onChange={(value) => setField("postal_code", value)}
          />
          <Field
            label="Cidade"
            value={form.city ?? ""}
            onChange={(value) => setField("city", value)}
          />
          <Field
            label="UF"
            value={form.state ?? ""}
            onChange={(value) => setField("state", value.toUpperCase().slice(0, 2))}
          />
        </FormSection>

        <FormSection title="Responsável">
          <Field
            label="Nome"
            value={form.responsible_name ?? ""}
            onChange={(value) => setField("responsible_name", value)}
          />
          <Field
            label="E-mail"
            type="email"
            value={form.responsible_email ?? ""}
            onChange={(value) => setField("responsible_email", value)}
          />
          <Field
            label="Telefone"
            value={form.responsible_phone ?? ""}
            onChange={(value) => setField("responsible_phone", value)}
          />
          <Field
            label="WhatsApp"
            value={form.responsible_whatsapp ?? ""}
            onChange={(value) => setField("responsible_whatsapp", value)}
          />
        </FormSection>

        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <span className="text-muted-foreground">Situação atual: </span>
          <span className="font-medium">
            {organization ? statusLabels[organization.status] : "—"}
          </span>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm font-medium text-destructive">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            <Save />
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 font-semibold">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
