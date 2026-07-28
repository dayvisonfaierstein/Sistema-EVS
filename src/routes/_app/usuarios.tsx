import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Copy,
  KeyRound,
  MailPlus,
  MoreHorizontal,
  Search,
  Settings2,
  ShieldCheck,
  UserCheck,
  UserCog,
  UserPlus,
  UserX,
  Users,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useAuth } from "@/contexts/AuthContext";
import {
  createTeamUser,
  listAccessTemplates,
  listTeamUsers,
  promoteTeamUser,
  resetTeamUserAccess,
  setTeamUserStatus,
  updateTeamUser,
  type AccessCredentials,
  type TeamUserInput,
} from "@/services/team-users";
import type { AccessTemplateKey, Profile } from "@/types/database";

export const Route = createFileRoute("/_app/usuarios")({
  head: () => ({ meta: [{ title: "Usuários — Espaço+" }] }),
  component: TeamUsersPage,
});

const templateLabels: Record<string, string> = {
  administrator: "Administrador",
  commercial: "Comercial",
  service: "Atendimento",
  assessment: "Avaliação",
  inventory: "Estoque",
  finance: "Financeiro",
  custom: "Personalizado",
};

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  administrator: "Administrador",
  manager: "Gestor",
  attendant: "Atendente",
  evaluator: "Avaliador",
  finance: "Financeiro",
  inventory: "Estoque",
  client: "Cliente",
};

const emptyForm: TeamUserInput = {
  fullName: "",
  email: "",
  phone: "",
  jobTitle: "",
  accessTemplate: "service",
  delivery: "temporary_password",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function TeamUsersPage() {
  const queryClient = useQueryClient();
  const { profile, hasPermission } = useAuth();
  const [search, setSearch] = useState("");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [form, setForm] = useState<TeamUserInput>(emptyForm);
  const [credentials, setCredentials] = useState<AccessCredentials | null>(null);
  const [copied, setCopied] = useState(false);

  const users = useQuery({ queryKey: ["team-users"], queryFn: listTeamUsers });
  const templates = useQuery({
    queryKey: ["access-templates"],
    queryFn: listAccessTemplates,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["team-users"] });

  const saveMutation = useMutation<AccessCredentials | { success: true }, Error, void>({
    mutationFn: () =>
      editing
        ? updateTeamUser(editing.id, form)
        : createTeamUser({
            ...form,
            email: form.email?.trim(),
          }),
    onSuccess: async (result) => {
      await refresh();
      setFormOpen(false);
      setEditing(null);
      setForm(emptyForm);
      if (!editing) setCredentials(result as AccessCredentials);
      toast.success(editing ? "Usuário atualizado." : "Usuário cadastrado.");
    },
    onError: (error) => toast.error(error.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ user, active }: { user: Profile; active: boolean }) =>
      setTeamUserStatus(user.id, active),
    onSuccess: async () => {
      await refresh();
      toast.success("Situação do usuário atualizada.");
    },
    onError: (error) => toast.error(error.message),
  });

  const resetMutation = useMutation({
    mutationFn: resetTeamUserAccess,
    onSuccess: (result) => {
      setCredentials(result);
      toast.success("Novo acesso provisório gerado.");
    },
    onError: (error) => toast.error(error.message),
  });

  const promoteMutation = useMutation({
    mutationFn: promoteTeamUser,
    onSuccess: async () => {
      await refresh();
      toast.success("Usuário promovido a administrador.");
    },
    onError: (error) => toast.error(error.message),
  });

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (users.data ?? []).filter((user) => {
      const matchesSearch =
        !term ||
        user.full_name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.job_title?.toLowerCase().includes(term);
      const matchesTemplate = templateFilter === "all" || user.access_template === templateFilter;
      const matchesStatus =
        statusFilter === "all" || (statusFilter === "active" ? user.active : !user.active);
      return matchesSearch && matchesTemplate && matchesStatus;
    });
  }, [search, statusFilter, templateFilter, users.data]);

  function openNewUser() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(user: Profile) {
    setEditing(user);
    setForm({
      fullName: user.full_name,
      email: user.email,
      phone: user.phone ?? "",
      jobTitle: user.job_title ?? "",
      accessTemplate: (user.access_template as AccessTemplateKey) ?? "custom",
    });
    setFormOpen(true);
  }

  function copyCredentials() {
    if (!credentials?.temporaryPassword) return;
    const content = `Acesso ao Espaço+\nE-mail: ${credentials.email}\nSenha provisória: ${credentials.temporaryPassword}`;
    void navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      toast.success("Dados de acesso copiados.");
      window.setTimeout(() => setCopied(false), 2000);
    });
  }

  const canCreate = hasPermission("users.create");
  const canUpdate = hasPermission("users.update");
  const canActivate = hasPermission("users.activate");
  const canPromote = hasPermission("users.permissions");

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie sua equipe, modelos de acesso e situações dos usuários.
          </p>
        </div>
        {canCreate && (
          <Button onClick={openNewUser}>
            <UserPlus />
            Novo usuário
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Usuários cadastrados"
          value={users.data?.length ?? 0}
          icon={<Users />}
          color="bg-emerald-100 text-emerald-700"
        />
        <SummaryCard
          label="Usuários ativos"
          value={users.data?.filter((user) => user.active).length ?? 0}
          icon={<UserCheck />}
          color="bg-sky-100 text-sky-700"
        />
        <SummaryCard
          label="Primeiro acesso pendente"
          value={users.data?.filter((user) => user.first_access).length ?? 0}
          icon={<KeyRound />}
          color="bg-amber-100 text-amber-700"
        />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px_180px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por nome, e-mail ou função..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Select value={templateFilter} onValueChange={setTemplateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os modelos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os modelos</SelectItem>
                {templates.data?.map((template) => (
                  <SelectItem key={template.key} value={template.key}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último acesso</TableHead>
                <TableHead className="w-14" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const administrator = user.is_organization_admin || user.role === "administrator";
                return (
                  <TableRow key={user.id} className={!user.active ? "opacity-65" : undefined}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-10">
                          <AvatarImage src={user.avatar_url ?? undefined} />
                          <AvatarFallback>{initials(user.full_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2 font-medium">
                            {user.full_name}
                            {user.id === profile?.id && (
                              <span className="text-xs text-muted-foreground">(você)</span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{user.job_title || roleLabels[user.role] || user.role}</div>
                      {administrator && (
                        <span className="text-xs text-primary">Acesso administrativo</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {templateLabels[user.access_template ?? "custom"] ?? "Personalizado"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <Badge variant={user.active ? "default" : "secondary"}>
                          {user.active ? "Ativo" : "Inativo"}
                        </Badge>
                        {user.first_access && (
                          <span className="text-xs text-amber-700">Primeiro acesso pendente</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.last_access_at
                        ? new Intl.DateTimeFormat("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          }).format(new Date(user.last_access_at))
                        : "Nunca acessou"}
                    </TableCell>
                    <TableCell>
                      {(canUpdate || canActivate || canPromote) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canUpdate && !administrator && (
                              <DropdownMenuItem onClick={() => openEdit(user)}>
                                <UserCog />
                                Editar usuário
                              </DropdownMenuItem>
                            )}
                            {canActivate && !administrator && user.id !== profile?.id && (
                              <DropdownMenuItem
                                onClick={() =>
                                  statusMutation.mutate({ user, active: !user.active })
                                }
                              >
                                {user.active ? <UserX /> : <UserCheck />}
                                {user.active ? "Inativar" : "Ativar"}
                              </DropdownMenuItem>
                            )}
                            {canUpdate && user.active && user.id !== profile?.id && (
                              <DropdownMenuItem
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Gerar uma nova senha provisória para ${user.full_name}?`,
                                    )
                                  )
                                    resetMutation.mutate(user.id);
                                }}
                              >
                                <KeyRound />
                                Redefinir acesso
                              </DropdownMenuItem>
                            )}
                            {canPromote && !administrator && user.active && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                  <Link to="/usuarios/$id/permissoes" params={{ id: user.id }}>
                                    <Settings2 />
                                    Gerenciar permissões
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        `${user.full_name} terá acesso total ao Espaço. Deseja promover este usuário a administrador?`,
                                      )
                                    )
                                      promoteMutation.mutate(user.id);
                                  }}
                                >
                                  <ShieldCheck />
                                  Promover a administrador
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {!users.isLoading && filteredUsers.length === 0 && (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Nenhum usuário encontrado com os filtros selecionados.
          </div>
        )}
        {users.isLoading && (
          <div className="p-10 text-center text-sm text-muted-foreground">Carregando equipe...</div>
        )}
      </Card>

      <UserFormDialog
        open={formOpen}
        editing={editing}
        form={form}
        templates={templates.data ?? []}
        saving={saveMutation.isPending}
        onOpenChange={setFormOpen}
        onChange={setForm}
        onSave={() => saveMutation.mutate()}
      />

      <CredentialsDialog
        credentials={credentials}
        copied={copied}
        onClose={() => setCredentials(null)}
        onCopy={copyCredentials}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <div className={`grid size-11 place-items-center rounded-xl [&>svg]:size-5 ${color}`}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function UserFormDialog({
  open,
  editing,
  form,
  templates,
  saving,
  onOpenChange,
  onChange,
  onSave,
}: {
  open: boolean;
  editing: Profile | null;
  form: TeamUserInput;
  templates: Array<{ key: AccessTemplateKey; name: string }>;
  saving: boolean;
  onOpenChange(open: boolean): void;
  onChange(form: TeamUserInput): void;
  onSave(): void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar usuário" : "Novo usuário"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Atualize os dados e o modelo de acesso deste usuário."
              : "Cadastre um integrante e escolha como entregar o primeiro acesso."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Nome completo *</Label>
            <Input
              value={form.fullName}
              onChange={(event) => onChange({ ...form, fullName: event.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>E-mail *</Label>
            <Input
              type="email"
              disabled={Boolean(editing)}
              value={form.email}
              onChange={(event) => onChange({ ...form, email: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input
              value={form.phone}
              onChange={(event) => onChange({ ...form, phone: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Função/cargo</Label>
            <Input
              placeholder="Ex.: Atendente"
              value={form.jobTitle}
              onChange={(event) => onChange({ ...form, jobTitle: event.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Modelo de acesso *</Label>
            <Select
              value={form.accessTemplate}
              onValueChange={(value) =>
                onChange({ ...form, accessTemplate: value as AccessTemplateKey })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templates
                  .filter((template) => template.key !== "administrator")
                  .map((template) => (
                    <SelectItem key={template.key} value={template.key}>
                      {template.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          {!editing && (
            <div className="space-y-2 sm:col-span-2">
              <Label>Entrega do acesso</Label>
              <Select
                value={form.delivery}
                onValueChange={(value) =>
                  onChange({
                    ...form,
                    delivery: value as "invite" | "temporary_password",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="temporary_password">
                    Gerar senha provisória para copiar
                  </SelectItem>
                  <SelectItem value="invite">Enviar convite por e-mail</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={onSave}
            disabled={saving || form.fullName.trim().length < 3 || !form.email?.includes("@")}
          >
            {editing ? <UserCog /> : <MailPlus />}
            {saving ? "Salvando..." : editing ? "Salvar alterações" : "Cadastrar usuário"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CredentialsDialog({
  credentials,
  copied,
  onClose,
  onCopy,
}: {
  credentials: AccessCredentials | null;
  copied: boolean;
  onClose(): void;
  onCopy(): void;
}) {
  return (
    <Dialog open={Boolean(credentials)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {credentials?.temporaryPassword ? "Acesso provisório gerado" : "Convite enviado"}
          </DialogTitle>
          <DialogDescription>
            {credentials?.temporaryPassword
              ? "Copie os dados agora. A senha não será armazenada nem exibida novamente."
              : "O usuário receberá por e-mail o link para concluir o primeiro acesso."}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="text-xs text-muted-foreground">E-mail</p>
          <p className="font-medium">{credentials?.email}</p>
          {credentials?.temporaryPassword && (
            <>
              <p className="mt-4 text-xs text-muted-foreground">Senha provisória</p>
              <p className="break-all font-mono text-lg font-bold">
                {credentials.temporaryPassword}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Válida por {credentials.expiresInDays ?? 7} dias. A troca será obrigatória.
              </p>
            </>
          )}
        </div>
        <DialogFooter>
          {credentials?.temporaryPassword && (
            <Button onClick={onCopy}>
              {copied ? <Check /> : <Copy />}
              {copied ? "Copiado" : "Copiar acesso"}
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
