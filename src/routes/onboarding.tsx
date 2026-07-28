import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Building2,
  CheckCircle2,
  ImagePlus,
  KeyRound,
  MapPin,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabase } from "@/integrations/supabase/client";
import { createSquareProductPhoto } from "@/lib/image-processing";
import type { Organization } from "@/types/database";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Primeiro acesso — Espaço+" }] }),
  component: FirstAccess,
});

type OrganizationForm = {
  legal_name: string;
  trade_name: string;
  document: string;
  legal_document_type: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  address_number: string;
  address_complement: string;
  neighborhood: string;
  city: string;
  state: string;
  postal_code: string;
  responsible_name: string;
  responsible_phone: string;
  responsible_whatsapp: string;
  responsible_email: string;
  logo_url: string | null;
};

const emptyOrganization: OrganizationForm = {
  legal_name: "",
  trade_name: "",
  document: "",
  legal_document_type: "CNPJ",
  email: "",
  phone: "",
  whatsapp: "",
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
  logo_url: null,
};

function text(value: string | null | undefined) {
  return value ?? "";
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required ? " *" : ""}
      </Label>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function FirstAccess() {
  const { session, profile, environment, loading } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [organization, setOrganization] = useState<OrganizationForm>(emptyOrganization);
  const [organizationLoading, setOrganizationLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  const isOrganizationAdmin = Boolean(
    profile?.is_organization_admin || profile?.role === "administrator",
  );

  const updateOrganization = (key: keyof OrganizationForm, value: string) =>
    setOrganization((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setPhone(profile.phone ?? "");
  }, [profile]);

  useEffect(() => {
    if (!session || !profile?.organization_id || !isOrganizationAdmin) return;
    setOrganizationLoading(true);
    void (async () => {
      try {
        const { data, error } = await getSupabase()
          .from("organizations")
          .select("*")
          .eq("id", profile.organization_id)
          .single();
        if (error) {
          toast.error("Não foi possível carregar os dados do Espaço.");
          return;
        }
        const item = data as Organization;
        setOrganization({
          legal_name: text(item.legal_name),
          trade_name: text(item.trade_name),
          document: text(item.document),
          legal_document_type: text(item.legal_document_type) || "CNPJ",
          email: text(item.email),
          phone: text(item.phone),
          whatsapp: text(item.whatsapp),
          address: text(item.address),
          address_number: text(item.address_number),
          address_complement: text(item.address_complement),
          neighborhood: text(item.neighborhood),
          city: text(item.city),
          state: text(item.state),
          postal_code: text(item.postal_code),
          responsible_name: text(item.responsible_name) || profile.full_name,
          responsible_phone: text(item.responsible_phone) || text(profile.phone),
          responsible_whatsapp: text(item.responsible_whatsapp),
          responsible_email: text(item.responsible_email) || profile.email,
          logo_url: item.logo_url,
        });
      } finally {
        setOrganizationLoading(false);
      }
    })();
  }, [isOrganizationAdmin, profile, session]);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/login", replace: true });
    } else if (profile && !profile.first_access) {
      navigate({
        to:
          profile.is_platform_admin || profile.role === "super_admin"
            ? "/admin"
            : environment?.accessAllowed === false
              ? "/aguardando-ativacao"
              : profile.role === "client"
                ? "/portal"
                : "/dashboard",
        replace: true,
      });
    }
  }, [environment, loading, navigate, profile, session]);

  useEffect(
    () => () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    },
    [logoPreview],
  );

  const expired = useMemo(
    () =>
      Boolean(
        profile?.first_access &&
        profile.provisional_access_expires_at &&
        new Date(profile.provisional_access_expires_at) < new Date(),
      ),
    [profile],
  );

  function selectLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Use uma imagem JPEG, PNG ou WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5 MB.");
      return;
    }
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function validate() {
    if (fullName.trim().length < 3) return "Informe seu nome completo.";
    if (password.length < 8) return "A nova senha precisa ter pelo menos 8 caracteres.";
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password))
      return "Use letras maiúsculas, minúsculas e pelo menos um número.";
    if (password !== passwordConfirmation) return "As senhas não são iguais.";
    if (!confirmed) return "Confirme que os dados informados estão corretos.";
    if (!isOrganizationAdmin) return null;
    if (
      organization.legal_name.trim().length < 2 ||
      organization.trade_name.trim().length < 2 ||
      organization.address.trim().length < 3 ||
      organization.city.trim().length < 2 ||
      organization.state.trim().length !== 2 ||
      organization.responsible_name.trim().length < 3
    )
      return "Preencha todos os campos obrigatórios do Espaço.";
    return null;
  }

  async function complete() {
    const validationError = validate();
    if (validationError) return toast.error(validationError);

    setSaving(true);
    let uploadedLogoPath: string | null = null;
    try {
      const supabase = getSupabase();
      const { error: passwordError } = await supabase.auth.updateUser({ password });
      if (passwordError) throw passwordError;

      let logoPath = organization.logo_url;
      if (logoFile && profile?.organization_id) {
        const optimizedLogo = await createSquareProductPhoto(logoFile);
        uploadedLogoPath = `${profile.organization_id}/logo-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("organization-logos")
          .upload(uploadedLogoPath, optimizedLogo, {
            contentType: "image/jpeg",
            upsert: false,
          });
        if (uploadError) throw uploadError;
        logoPath = uploadedLogoPath;
      }

      const result = isOrganizationAdmin
        ? await supabase.rpc("complete_organization_onboarding", {
            p_full_name: fullName.trim(),
            p_phone: phone.trim() || null,
            p_legal_name: organization.legal_name.trim(),
            p_trade_name: organization.trade_name.trim(),
            p_document: organization.document.trim() || null,
            p_legal_document_type: organization.legal_document_type || null,
            p_email: organization.email.trim() || null,
            p_organization_phone: organization.phone.trim() || null,
            p_whatsapp: organization.whatsapp.trim() || null,
            p_address: organization.address.trim(),
            p_address_number: organization.address_number.trim() || null,
            p_address_complement: organization.address_complement.trim() || null,
            p_neighborhood: organization.neighborhood.trim() || null,
            p_city: organization.city.trim(),
            p_state: organization.state.trim(),
            p_postal_code: organization.postal_code.trim() || null,
            p_responsible_name: organization.responsible_name.trim(),
            p_responsible_phone: organization.responsible_phone.trim() || null,
            p_responsible_whatsapp: organization.responsible_whatsapp.trim() || null,
            p_responsible_email: organization.responsible_email.trim() || null,
            p_logo_url: logoPath,
          })
        : await supabase.rpc("complete_first_access", {
            p_full_name: fullName.trim(),
            p_phone: phone.trim() || null,
          });
      if (result.error) throw result.error;

      toast.success(
        isOrganizationAdmin ? "Configuração do Espaço concluída." : "Primeiro acesso concluído.",
      );
      window.location.assign("/dashboard");
    } catch (error) {
      if (uploadedLogoPath) {
        await getSupabase().storage.from("organization-logos").remove([uploadedLogoPath]);
      }
      toast.error(
        error instanceof Error ? error.message : "Não foi possível concluir o primeiro acesso.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading || !session) return null;

  if (!profile)
    return (
      <CenteredMessage
        icon={<ShieldCheck className="size-10 text-primary" />}
        title="Acesso ainda não provisionado"
        description="Sua conta existe, mas ainda não está vinculada a um Espaço. Entre em contato com o administrador da plataforma."
      />
    );

  if (expired)
    return (
      <CenteredMessage
        icon={<KeyRound className="size-10 text-destructive" />}
        title="Acesso provisório expirado"
        description="Solicite ao suporte do Espaço+ a emissão de um novo acesso seguro."
      />
    );

  return (
    <div className="min-h-screen bg-muted/30 p-4 sm:p-8">
      <Card className="mx-auto w-full max-w-5xl">
        <CardHeader className="border-b">
          <div className="mb-2 grid size-12 place-items-center rounded-xl bg-primary-soft text-primary">
            {isOrganizationAdmin ? <Building2 /> : <UserRound />}
          </div>
          <CardTitle>
            {isOrganizationAdmin ? "Configure seu Espaço" : "Conclua seu primeiro acesso"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {isOrganizationAdmin
              ? "Confirme os dados do estabelecimento e crie sua senha pessoal antes de acessar o sistema."
              : "Confirme seus dados e substitua a senha provisória por uma senha pessoal."}
          </p>
        </CardHeader>
        <CardContent className="grid gap-7 p-5 sm:p-7">
          <Section title="Seu acesso" icon={<UserRound />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome completo" required value={fullName} onChange={setFullName} />
              <Field label="Telefone" value={phone} onChange={setPhone} />
            </div>
          </Section>

          {isOrganizationAdmin && (
            <>
              <Section title="Dados do estabelecimento" icon={<Building2 />}>
                {organizationLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando dados...</p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2 flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center">
                      <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted">
                        {logoPreview ? (
                          <img
                            src={logoPreview}
                            alt="Prévia da logo"
                            className="size-full object-contain"
                          />
                        ) : (
                          <ImagePlus className="size-8 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <Label htmlFor="organization-logo" className="cursor-pointer">
                          <span className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium">
                            Selecionar logo
                          </span>
                        </Label>
                        <Input
                          id="organization-logo"
                          className="hidden"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={selectLogo}
                        />
                        <p className="mt-2 text-xs text-muted-foreground">
                          JPEG, PNG ou WebP, até 5 MB. A imagem será otimizada automaticamente.
                        </p>
                      </div>
                    </div>
                    <Field
                      label="Nome fantasia"
                      required
                      value={organization.trade_name}
                      onChange={(value) => updateOrganization("trade_name", value)}
                    />
                    <Field
                      label="Razão social"
                      required
                      value={organization.legal_name}
                      onChange={(value) => updateOrganization("legal_name", value)}
                    />
                    <Field
                      label="CNPJ ou CPF"
                      value={text(organization.document)}
                      onChange={(value) => updateOrganization("document", value)}
                    />
                    <Field
                      label="E-mail do estabelecimento"
                      type="email"
                      value={text(organization.email)}
                      onChange={(value) => updateOrganization("email", value)}
                    />
                    <Field
                      label="Telefone"
                      value={text(organization.phone)}
                      onChange={(value) => updateOrganization("phone", value)}
                    />
                    <Field
                      label="WhatsApp"
                      value={text(organization.whatsapp)}
                      onChange={(value) => updateOrganization("whatsapp", value)}
                    />
                  </div>
                )}
              </Section>

              <Section title="Endereço" icon={<MapPin />}>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="sm:col-span-2">
                    <Field
                      label="Endereço"
                      required
                      value={text(organization.address)}
                      onChange={(value) => updateOrganization("address", value)}
                    />
                  </div>
                  <Field
                    label="Número"
                    value={text(organization.address_number)}
                    onChange={(value) => updateOrganization("address_number", value)}
                  />
                  <Field
                    label="Complemento"
                    value={text(organization.address_complement)}
                    onChange={(value) => updateOrganization("address_complement", value)}
                  />
                  <Field
                    label="Bairro"
                    value={text(organization.neighborhood)}
                    onChange={(value) => updateOrganization("neighborhood", value)}
                  />
                  <Field
                    label="CEP"
                    value={text(organization.postal_code)}
                    onChange={(value) => updateOrganization("postal_code", value)}
                  />
                  <div className="sm:col-span-2">
                    <Field
                      label="Cidade"
                      required
                      value={text(organization.city)}
                      onChange={(value) => updateOrganization("city", value)}
                    />
                  </div>
                  <Field
                    label="UF"
                    required
                    value={text(organization.state)}
                    onChange={(value) =>
                      updateOrganization("state", value.toUpperCase().slice(0, 2))
                    }
                    placeholder="PE"
                  />
                </div>
              </Section>

              <Section title="Responsável pelo Espaço" icon={<ShieldCheck />}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Nome do responsável"
                    required
                    value={text(organization.responsible_name)}
                    onChange={(value) => updateOrganization("responsible_name", value)}
                  />
                  <Field
                    label="E-mail"
                    type="email"
                    value={text(organization.responsible_email)}
                    onChange={(value) => updateOrganization("responsible_email", value)}
                  />
                  <Field
                    label="Telefone"
                    value={text(organization.responsible_phone)}
                    onChange={(value) => updateOrganization("responsible_phone", value)}
                  />
                  <Field
                    label="WhatsApp"
                    value={text(organization.responsible_whatsapp)}
                    onChange={(value) => updateOrganization("responsible_whatsapp", value)}
                  />
                </div>
              </Section>
            </>
          )}

          <Section title="Crie sua senha pessoal" icon={<KeyRound />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Nova senha"
                required
                type="password"
                value={password}
                onChange={setPassword}
              />
              <Field
                label="Confirmar senha"
                required
                type="password"
                value={passwordConfirmation}
                onChange={setPasswordConfirmation}
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Use pelo menos 8 caracteres, com letras maiúsculas, minúsculas e números. A senha é
              armazenada exclusivamente pelo Supabase Auth.
            </p>
          </Section>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-muted/20 p-4">
            <Checkbox
              className="mt-0.5"
              checked={confirmed}
              onCheckedChange={(value) => setConfirmed(value === true)}
            />
            <span className="text-sm leading-5">
              Confirmo que revisei os dados informados e que estão corretos.
            </span>
          </label>

          {isOrganizationAdmin && (
            <p className="rounded-xl bg-primary-soft p-4 text-sm text-primary">
              Após esta etapa, o ambiente será liberado automaticamente quando a assinatura estiver
              ativa ou em período de teste.
            </p>
          )}

          <Button
            size="lg"
            onClick={() => void complete()}
            disabled={saving || organizationLoading}
          >
            <CheckCircle2 />
            {saving ? "Concluindo configuração..." : "Confirmar e continuar"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
        <span className="text-primary [&>svg]:size-5">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function CenteredMessage({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="p-8 text-center">
          <div className="mb-4 flex justify-center">{icon}</div>
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </div>
  );
}
