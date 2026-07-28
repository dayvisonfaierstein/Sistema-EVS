import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, CalendarClock, ImagePlus, Megaphone, Plus, Send } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { PageHeader, StatCard } from "@/components/layout/PageChrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { listAdminOrganizations } from "@/services/platform-admin";
import {
  createPlatformAnnouncement,
  listPlatformAnnouncements,
  publishPlatformAnnouncement,
  type AnnouncementAudience,
  type AnnouncementChannel,
  type AnnouncementInput,
  type AnnouncementPriority,
} from "@/services/platform-communications";

export const Route = createFileRoute("/admin/comunicacoes")({
  head: () => ({ meta: [{ title: "Central de Comunicação — Espaço+ Admin" }] }),
  component: CommunicationsPage,
});

const channelLabels: Record<AnnouncementChannel, string> = {
  notification_center: "Sininho",
  login_modal: "Janela ao entrar",
  dashboard_banner: "Banner no dashboard",
  dashboard_card: "Card no dashboard",
};
const statusLabels = {
  draft: "Rascunho",
  scheduled: "Agendado",
  published: "Publicado",
  expired: "Expirado",
  cancelled: "Cancelado",
};
const priorityLabels: Record<AnnouncementPriority, string> = {
  normal: "Normal",
  important: "Importante",
  urgent: "Urgente",
};
const initialForm: AnnouncementInput = {
  title: "",
  message: "",
  announcement_type: "information",
  priority: "normal",
  audience_type: "all",
  display_channels: ["notification_center"],
  action_label: "",
  action_url: "",
  show_once: false,
  dismissible: true,
  requires_acknowledgement: false,
  starts_at: "",
  ends_at: "",
};

function CommunicationsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AnnouncementInput>(initialForm);
  const [selectedOrganizations, setSelectedOrganizations] = useState<string[]>([]);
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const announcements = useQuery({
    queryKey: ["platform-announcements"],
    queryFn: listPlatformAnnouncements,
  });
  const organizations = useQuery({
    queryKey: ["admin-organizations"],
    queryFn: listAdminOrganizations,
  });
  const previewUrl = useMemo(() => (image ? URL.createObjectURL(image) : null), [image]);
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const mutation = useMutation({
    mutationFn: async (shouldPublish: boolean) => {
      const announcement = await createPlatformAnnouncement(form, image);
      if (shouldPublish) await publishPlatformAnnouncement(announcement.id, selectedOrganizations);
    },
    onSuccess: async (_data, shouldPublish) => {
      toast.success(shouldPublish ? "Comunicado publicado." : "Rascunho salvo.");
      setOpen(false);
      reset();
      await queryClient.invalidateQueries({ queryKey: ["platform-announcements"] });
    },
    onError: (mutationError) => {
      setError(mutationError.message);
      toast.error(mutationError.message);
    },
  });

  function reset() {
    setForm(initialForm);
    setSelectedOrganizations([]);
    setImage(null);
    setError(null);
  }
  function toggleChannel(channel: AnnouncementChannel) {
    setForm({
      ...form,
      display_channels: form.display_channels.includes(channel)
        ? form.display_channels.filter((item) => item !== channel)
        : [...form.display_channels, channel],
    });
  }
  function submit(shouldPublish: boolean) {
    setError(null);
    if (form.title.trim().length < 3 || form.message.trim().length < 3)
      return setError("Informe título e mensagem.");
    if (!form.display_channels.length) return setError("Selecione pelo menos um canal.");
    if (form.audience_type === "organizations" && !selectedOrganizations.length)
      return setError("Selecione pelo menos um Espaço.");
    if (
      image &&
      (!["image/jpeg", "image/png", "image/webp"].includes(image.type) ||
        image.size > 5 * 1024 * 1024)
    )
      return setError("Use uma imagem JPEG, PNG ou WebP de até 5 MB.");
    mutation.mutate(shouldPublish);
  }

  const data = announcements.data ?? [];
  return (
    <div>
      <PageHeader
        title="Central de Comunicação"
        description="Crie avisos, atualizações e mensagens para os Espaços."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus /> Novo comunicado
          </Button>
        }
      />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard title="Comunicados" value={data.length} icon={Megaphone} tone="primary" />
        <StatCard
          title="Publicados"
          value={data.filter((item) => item.status === "published").length}
          icon={BellRing}
          tone="info"
        />
        <StatCard
          title="Agendados"
          value={data.filter((item) => item.status === "scheduled").length}
          icon={CalendarClock}
          tone="warning"
        />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Comunicado</th>
                  <th className="px-4 py-3">Prioridade</th>
                  <th className="px-4 py-3">Público</th>
                  <th className="px-4 py-3">Canais</th>
                  <th className="px-4 py-3">Situação</th>
                  <th className="px-4 py-3">Criação</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{item.title}</div>
                      <div className="max-w-md truncate text-xs text-muted-foreground">
                        {item.message}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={item.priority === "urgent" ? "destructive" : "outline"}>
                        {priorityLabels[item.priority]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {item.audience_type === "all"
                        ? "Todos os Espaços"
                        : item.audience_type === "organizations"
                          ? "Selecionados"
                          : item.audience_type === "subscription_overdue"
                            ? "Mensalidade vencida"
                            : "Período de teste"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {item.display_channels.map((channel) => channelLabels[channel]).join(", ")}
                    </td>
                    <td className="px-4 py-3">
                      <Badge>{statusLabels[item.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!announcements.isLoading && !data.length && (
            <p className="p-12 text-center text-sm text-muted-foreground">
              Nenhum comunicado criado.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) reset();
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Novo comunicado</DialogTitle>
            <DialogDescription>
              Configure conteúdo, destinatários e como o aviso será apresentado.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Título *">
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </Field>
              <Field label="Tipo">
                <select
                  className="h-9 w-full rounded-md border bg-background px-3"
                  value={form.announcement_type}
                  onChange={(e) => setForm({ ...form, announcement_type: e.target.value })}
                >
                  <option value="information">Informativo</option>
                  <option value="system_update">Atualização do sistema</option>
                  <option value="maintenance">Manutenção</option>
                  <option value="billing">Cobrança</option>
                  <option value="urgent">Urgente</option>
                  <option value="campaign">Campanha</option>
                </select>
              </Field>
            </div>
            <Field label="Mensagem *">
              <Textarea
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prioridade">
                <select
                  className="h-9 w-full rounded-md border bg-background px-3"
                  value={form.priority}
                  onChange={(e) =>
                    setForm({ ...form, priority: e.target.value as AnnouncementPriority })
                  }
                >
                  <option value="normal">Normal</option>
                  <option value="important">Importante</option>
                  <option value="urgent">Urgente</option>
                </select>
              </Field>
              <Field label="Público">
                <select
                  className="h-9 w-full rounded-md border bg-background px-3"
                  value={form.audience_type}
                  onChange={(e) =>
                    setForm({ ...form, audience_type: e.target.value as AnnouncementAudience })
                  }
                >
                  <option value="all">Todos os Espaços</option>
                  <option value="organizations">Espaços selecionados</option>
                  <option value="subscription_overdue">Mensalidade vencida</option>
                  <option value="subscription_trial">Período de teste</option>
                </select>
              </Field>
            </div>
            {form.audience_type === "organizations" && (
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-xl border p-3">
                {organizations.data?.map((org) => (
                  <label key={org.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedOrganizations.includes(org.id)}
                      onCheckedChange={(checked) =>
                        setSelectedOrganizations(
                          checked
                            ? [...selectedOrganizations, org.id]
                            : selectedOrganizations.filter((id) => id !== org.id),
                        )
                      }
                    />
                    {org.trade_name}
                  </label>
                ))}
              </div>
            )}
            <div>
              <Label>Canais de exibição</Label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {Object.entries(channelLabels).map(([value, label]) => (
                  <label
                    key={value}
                    className="flex items-center gap-2 rounded-lg border p-3 text-sm"
                  >
                    <Checkbox
                      checked={form.display_channels.includes(value as AnnouncementChannel)}
                      onCheckedChange={() => toggleChannel(value as AnnouncementChannel)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Início">
                <Input
                  type="datetime-local"
                  value={form.starts_at ?? ""}
                  onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                />
              </Field>
              <Field label="Encerramento">
                <Input
                  type="datetime-local"
                  value={form.ends_at ?? ""}
                  onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Texto do botão">
                <Input
                  value={form.action_label ?? ""}
                  onChange={(e) => setForm({ ...form, action_label: e.target.value })}
                />
              </Field>
              <Field label="Link do botão">
                <Input
                  value={form.action_url ?? ""}
                  onChange={(e) => setForm({ ...form, action_url: e.target.value })}
                  placeholder="/financeiro ou https://..."
                />
              </Field>
            </div>
            <div className="rounded-xl border p-4">
              <Label
                htmlFor="announcement-image"
                className="flex cursor-pointer items-center gap-2"
              >
                <ImagePlus className="size-4" />
                Imagem opcional
              </Label>
              <Input
                id="announcement-image"
                className="mt-2"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setImage(e.target.files?.[0] ?? null)}
              />
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Prévia do comunicado"
                  className="mt-3 max-h-56 w-full rounded-lg object-contain"
                />
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Toggle
                label="Exibir uma vez"
                checked={form.show_once}
                onChange={(checked) => setForm({ ...form, show_once: checked })}
              />
              <Toggle
                label="Pode fechar"
                checked={form.dismissible}
                onChange={(checked) => setForm({ ...form, dismissible: checked })}
              />
              <Toggle
                label="Exigir confirmação"
                checked={form.requires_acknowledgement}
                onChange={(checked) => setForm({ ...form, requires_acknowledgement: checked })}
              />
            </div>
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="outline" onClick={() => submit(false)} disabled={mutation.isPending}>
              Salvar rascunho
            </Button>
            <Button onClick={() => submit(true)} disabled={mutation.isPending}>
              <Send />
              Publicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange(value: boolean): void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
