import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  ChevronRight,
  CircleMinus,
  CirclePlus,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import {
  getTeamUser,
  getTemplatePermissionKeys,
  getUserPermissionKeys,
  listAccessTemplates,
  listPermissionCatalog,
  saveUserPermissions,
} from "@/services/team-users";
import type { AccessTemplateKey, Permission } from "@/types/database";

export const Route = createFileRoute("/_app/usuarios/$id/permissoes")({
  head: () => ({ meta: [{ title: "Permissões do usuário — Espaço+" }] }),
  component: UserPermissionsPage,
});

const moduleLabels: Record<string, string> = {
  dashboard: "Dashboard",
  clients: "Clientes",
  assessments: "Avaliações",
  accesses: "Acessos",
  agenda: "Agenda",
  sales: "Vendas",
  products: "Produtos",
  inventory: "Estoque",
  recipes: "Receitas",
  finance: "Financeiro",
  events: "Eventos",
  campaigns: "Campanhas",
  reports: "Relatórios",
  users: "Usuários",
  settings: "Configurações",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function sameKeys(left: string[], right: string[]) {
  return left.length === right.length && left.every((key, index) => key === right[index]);
}

function UserPermissionsPage() {
  const { id } = Route.useParams();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [originalKeys, setOriginalKeys] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [originalTemplate, setOriginalTemplate] = useState<AccessTemplateKey>("custom");
  const [selectedTemplate, setSelectedTemplate] = useState<AccessTemplateKey>("custom");
  const [initialized, setInitialized] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);

  const user = useQuery({
    queryKey: ["team-user", id],
    queryFn: () => getTeamUser(id),
  });
  const catalog = useQuery({
    queryKey: ["permission-catalog"],
    queryFn: listPermissionCatalog,
  });
  const templates = useQuery({
    queryKey: ["access-templates"],
    queryFn: listAccessTemplates,
  });
  const userPermissions = useQuery({
    queryKey: ["team-user-permissions", id],
    queryFn: () => getUserPermissionKeys(id),
  });

  useEffect(() => {
    if (initialized || !user.data || !userPermissions.data) return;
    const keys = [...userPermissions.data].sort();
    const template = (user.data.access_template as AccessTemplateKey) ?? "custom";
    setOriginalKeys(keys);
    setSelectedKeys(keys);
    setOriginalTemplate(template);
    setSelectedTemplate(template);
    setInitialized(true);
  }, [initialized, user.data, userPermissions.data]);

  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, Permission[]>();
    for (const permission of catalog.data ?? []) {
      const current = groups.get(permission.module) ?? [];
      current.push(permission);
      groups.set(permission.module, current);
    }
    return Array.from(groups.entries()).sort(([left], [right]) =>
      (moduleLabels[left] ?? left).localeCompare(moduleLabels[right] ?? right, "pt-BR"),
    );
  }, [catalog.data]);

  const sortedSelected = useMemo(() => [...selectedKeys].sort(), [selectedKeys]);
  const addedKeys = useMemo(
    () => sortedSelected.filter((key) => !originalKeys.includes(key)),
    [originalKeys, sortedSelected],
  );
  const removedKeys = useMemo(
    () => originalKeys.filter((key) => !sortedSelected.includes(key)),
    [originalKeys, sortedSelected],
  );
  const hasChanges =
    !sameKeys(originalKeys, sortedSelected) || originalTemplate !== selectedTemplate;

  const saveMutation = useMutation({
    mutationFn: () => saveUserPermissions(id, sortedSelected, selectedTemplate),
    onSuccess: () => {
      setOriginalKeys(sortedSelected);
      setOriginalTemplate(selectedTemplate);
      toast.success("Permissões atualizadas e registradas na auditoria.");
    },
    onError: (error) => toast.error(error.message),
  });

  const administrator = Boolean(
    user.data?.is_organization_admin || user.data?.role === "administrator",
  );
  const canManage = hasPermission("users.permissions") && user.data?.active && !administrator;

  function togglePermission(key: string, checked: boolean) {
    setSelectedKeys((current) => {
      const next = checked
        ? Array.from(new Set([...current, key]))
        : current.filter((item) => item !== key);
      return next.sort();
    });
    setSelectedTemplate("custom");
  }

  function setModule(modulePermissions: Permission[], checked: boolean) {
    const moduleKeys = modulePermissions.map((permission) => permission.key);
    setSelectedKeys((current) => {
      const next = checked
        ? Array.from(new Set([...current, ...moduleKeys]))
        : current.filter((key) => !moduleKeys.includes(key));
      return next.sort();
    });
    setSelectedTemplate("custom");
  }

  async function applyTemplate(template: AccessTemplateKey) {
    setSelectedTemplate(template);
    if (template === "custom") return;
    setApplyingTemplate(true);
    try {
      const keys = await getTemplatePermissionKeys(template);
      setSelectedKeys(keys);
      toast.success(
        `Modelo ${templates.data?.find((item) => item.key === template)?.name} aplicado.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível aplicar o modelo.");
    } finally {
      setApplyingTemplate(false);
    }
  }

  function restoreOriginal() {
    setSelectedKeys(originalKeys);
    setSelectedTemplate(originalTemplate);
  }

  if (user.isLoading || catalog.isLoading || userPermissions.isLoading)
    return (
      <div className="grid min-h-[50vh] place-items-center text-sm text-muted-foreground">
        Carregando permissões...
      </div>
    );

  if (user.isError || !user.data)
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p>Não foi possível localizar este usuário.</p>
          <Button className="mt-4" onClick={() => navigate({ to: "/usuarios" })}>
            Voltar para usuários
          </Button>
        </CardContent>
      </Card>
    );

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" className="-ml-3 mb-2">
          <Link to="/usuarios">
            <ArrowLeft />
            Voltar para usuários
          </Link>
        </Button>
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div className="flex items-center gap-4">
            <Avatar className="size-14">
              <AvatarImage src={user.data.avatar_url ?? undefined} />
              <AvatarFallback>{initials(user.data.full_name)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Permissões</h1>
                <Badge variant={user.data.active ? "default" : "secondary"}>
                  {user.data.active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <p className="font-medium">{user.data.full_name}</p>
              <p className="text-sm text-muted-foreground">{user.data.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={restoreOriginal} disabled={!hasChanges}>
              <RotateCcw />
              Descartar alterações
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!canManage || !hasChanges || saveMutation.isPending || applyingTemplate}
            >
              <Save />
              {saveMutation.isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </div>
      </div>

      {administrator && (
        <Card className="border-primary/30 bg-primary-soft">
          <CardContent className="flex gap-3 p-5 text-primary">
            <ShieldCheck className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-semibold">Acesso administrativo total</p>
              <p className="text-sm">
                Administradores recebem automaticamente todas as permissões atuais e futuras.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!user.data.active && !administrator && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-5 text-sm text-amber-900">
            Este usuário está inativo. As permissões permanecem disponíveis para consulta e
            histórico, mas só podem ser alteradas após a reativação.
          </CardContent>
        </Card>
      )}

      {!administrator && (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="size-5 text-primary" />
                  Aplicar modelo de acesso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={selectedTemplate}
                  onValueChange={(value) => void applyTemplate(value as AccessTemplateKey)}
                  disabled={!canManage || applyingTemplate}
                >
                  <SelectTrigger className="max-w-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.data
                      ?.filter((template) => template.key !== "administrator")
                      .map((template) => (
                        <SelectItem key={template.key} value={template.key}>
                          {template.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="mt-2 text-sm text-muted-foreground">
                  Aplicar um modelo prepara a seleção. Nada será gravado até clicar em salvar.
                </p>
              </CardContent>
            </Card>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Permissões por módulo</h2>
                <p className="text-sm text-muted-foreground">
                  {selectedKeys.length} de {catalog.data?.length ?? 0} permissões selecionadas
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canManage}
                  onClick={() => {
                    setSelectedKeys(
                      (catalog.data ?? []).map((permission) => permission.key).sort(),
                    );
                    setSelectedTemplate("custom");
                  }}
                >
                  <CheckCheck />
                  Selecionar todas
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canManage}
                  onClick={() => {
                    setSelectedKeys([]);
                    setSelectedTemplate("custom");
                  }}
                >
                  <X />
                  Remover todas
                </Button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {groupedPermissions.map(([module, permissions]) => {
                const selectedCount = permissions.filter((permission) =>
                  selectedKeys.includes(permission.key),
                ).length;
                const allSelected = selectedCount === permissions.length;
                return (
                  <Card key={module}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <CardTitle className="text-base">
                            {moduleLabels[module] ?? module}
                          </CardTitle>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {selectedCount} de {permissions.length} selecionadas
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!canManage}
                          onClick={() => setModule(permissions, !allSelected)}
                        >
                          {allSelected ? "Remover módulo" : "Selecionar módulo"}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      {permissions.map((permission) => {
                        const checked = selectedKeys.includes(permission.key);
                        return (
                          <label
                            key={permission.id}
                            className="flex cursor-pointer items-start gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50"
                          >
                            <Checkbox
                              className="mt-0.5"
                              checked={checked}
                              disabled={!canManage}
                              onCheckedChange={(value) =>
                                togglePermission(permission.key, value === true)
                              }
                            />
                            <span>
                              <span className="block text-sm font-medium">{permission.name}</span>
                              {permission.description && (
                                <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                                  {permission.description}
                                </span>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <Card className="xl:sticky xl:top-24">
            <CardHeader>
              <CardTitle className="text-lg">Comparação das alterações</CardTitle>
              <p className="text-sm text-muted-foreground">
                Revise o estado anterior e o que será gravado.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <ComparisonRow
                label="Modelo anterior"
                value={templates.data?.find((item) => item.key === originalTemplate)?.name ?? "—"}
              />
              <ComparisonRow
                label="Novo modelo"
                value={templates.data?.find((item) => item.key === selectedTemplate)?.name ?? "—"}
                changed={originalTemplate !== selectedTemplate}
              />
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-800">
                  <CirclePlus className="mb-2 size-5" />
                  <p className="text-2xl font-bold">{addedKeys.length}</p>
                  <p className="text-xs">Adicionadas</p>
                </div>
                <div className="rounded-xl bg-red-50 p-3 text-red-800">
                  <CircleMinus className="mb-2 size-5" />
                  <p className="text-2xl font-bold">{removedKeys.length}</p>
                  <p className="text-xs">Removidas</p>
                </div>
              </div>
              {addedKeys.length > 0 && (
                <ChangeList title="Novas permissões" keys={addedKeys} icon="plus" />
              )}
              {removedKeys.length > 0 && (
                <ChangeList title="Permissões removidas" keys={removedKeys} icon="minus" />
              )}
              {!hasChanges && (
                <div className="flex items-center gap-2 rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                  <Check className="size-4" />
                  Nenhuma alteração pendente.
                </div>
              )}
              {hasChanges && (
                <p className="text-xs leading-5 text-muted-foreground">
                  Somente as diferenças serão persistidas. Cada inclusão e remoção ficará registrada
                  na auditoria.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function ComparisonRow({
  label,
  value,
  changed,
}: {
  label: string;
  value: string;
  changed?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={changed ? "font-semibold text-primary" : "font-medium"}>{value}</span>
    </div>
  );
}

function ChangeList({
  title,
  keys,
  icon,
}: {
  title: string;
  keys: string[];
  icon: "plus" | "minus";
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold">{title}</p>
      <div className="max-h-40 space-y-1 overflow-y-auto">
        {keys.map((key) => (
          <div key={key} className="flex items-center gap-2 text-xs text-muted-foreground">
            {icon === "plus" ? (
              <CirclePlus className="size-3.5 text-emerald-600" />
            ) : (
              <CircleMinus className="size-3.5 text-red-600" />
            )}
            <span className="min-w-0 flex-1 truncate">{key}</span>
            <ChevronRight className="size-3" />
          </div>
        ))}
      </div>
    </div>
  );
}
