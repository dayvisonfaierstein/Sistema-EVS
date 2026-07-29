import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { BellRing, Check, ExternalLink, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import {
  listReceivedAnnouncements,
  recordAnnouncementEvent,
  type ReceivedAnnouncement,
} from "@/services/platform-communications";
import { cn } from "@/lib/utils";

type CommunicationsValue = {
  announcements: ReceivedAnnouncement[];
  unreadCount: number;
  openCenter(): void;
};

const CommunicationsContext = createContext<CommunicationsValue | null>(null);

export function PlatformAnnouncementsProvider({ children }: { children: ReactNode }) {
  const { session, profile, configured } = useAuth();
  const [centerOpen, setCenterOpen] = useState(false);
  const query = useQuery({
    queryKey: ["received-platform-announcements", profile?.id],
    queryFn: listReceivedAnnouncements,
    enabled: Boolean(configured && session && profile?.organization_id),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
  const announcements = query.data ?? [];
  const unreadCount = announcements.filter((item) => !item.receipt?.read_at).length;
  const value = useMemo(
    () => ({ announcements, unreadCount, openCenter: () => setCenterOpen(true) }),
    [announcements, unreadCount],
  );
  return (
    <CommunicationsContext.Provider value={value}>
      {children}
      <CommunicationCenter
        open={centerOpen}
        onOpenChange={setCenterOpen}
        announcements={announcements}
      />
    </CommunicationsContext.Provider>
  );
}

export function usePlatformAnnouncements() {
  const value = useContext(CommunicationsContext);
  if (!value) return { announcements: [], unreadCount: 0, openCenter: () => undefined };
  return value;
}

export function PlatformAnnouncementDisplays() {
  const { announcements } = usePlatformAnnouncements();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const queryClient = useQueryClient();
  const isDashboard = pathname === "/dashboard";
  const modal = announcements.find(
    (item) =>
      item.display_channels.includes("login_modal") &&
      !item.receipt?.dismissed_at &&
      (item.requires_acknowledgement ? !item.receipt?.acknowledged_at : !item.receipt?.read_at) &&
      (!item.show_once || !item.receipt?.first_seen_at),
  );
  const [modalId, setModalId] = useState<string | null>(null);

  useEffect(() => {
    if (!modal || modalId) return;
    setModalId(modal.id);
    void recordAnnouncementEvent(modal.id, "displayed").then(() =>
      queryClient.invalidateQueries({ queryKey: ["received-platform-announcements"] }),
    );
  }, [modal, modalId, queryClient]);

  const banners = isDashboard
    ? announcements.filter(
        (item) =>
          item.display_channels.includes("dashboard_banner") &&
          !item.receipt?.dismissed_at &&
          (!item.show_once || !item.receipt?.first_seen_at),
      )
    : [];
  const cards = isDashboard
    ? announcements.filter(
        (item) =>
          item.display_channels.includes("dashboard_card") &&
          !item.receipt?.dismissed_at &&
          (!item.show_once || !item.receipt?.first_seen_at),
      )
    : [];

  return (
    <>
      {(banners.length > 0 || cards.length > 0) && (
        <div className="mb-5 space-y-4">
          {banners.map((item) => (
            <AnnouncementBanner key={item.id} item={item} />
          ))}
          {cards.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-2">
              {cards.map((item) => (
                <AnnouncementCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      )}
      {modal && (
        <AnnouncementModal
          item={modal}
          open={modalId === modal.id}
          onDone={() => {
            setModalId(null);
            void queryClient.invalidateQueries({
              queryKey: ["received-platform-announcements"],
            });
          }}
        />
      )}
    </>
  );
}

function CommunicationCenter({
  open,
  onOpenChange,
  announcements,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  announcements: ReceivedAnnouncement[];
}) {
  const queryClient = useQueryClient();
  async function read(item: ReceivedAnnouncement) {
    if (!item.receipt?.read_at) {
      await recordAnnouncementEvent(item.id, "read");
      await queryClient.invalidateQueries({ queryKey: ["received-platform-announcements"] });
    }
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Central de mensagens</SheetTitle>
          <SheetDescription>Comunicados enviados pela administração do Espaço+.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-3">
          {announcements.map((item) => (
            <button
              key={item.id}
              className={cn(
                "w-full rounded-xl border p-4 text-left transition-colors hover:bg-muted/40",
                !item.receipt?.read_at && "border-primary/30 bg-primary/5",
              )}
              onClick={() => void read(item)}
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="font-semibold">{item.title}</div>
                {!item.receipt?.read_at && <Badge>Novo</Badge>}
              </div>
              <p className="whitespace-pre-line text-sm text-muted-foreground">{item.message}</p>
              <div className="mt-3 text-xs text-muted-foreground">
                {new Date(item.published_at ?? item.created_at).toLocaleString("pt-BR")}
              </div>
            </button>
          ))}
          {!announcements.length && (
            <div className="py-16 text-center text-sm text-muted-foreground">
              <BellRing className="mx-auto mb-3 size-8 opacity-40" />
              Nenhuma mensagem disponível.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AnnouncementBanner({ item }: { item: ReceivedAnnouncement }) {
  const queryClient = useQueryClient();
  useEffect(() => {
    void recordAnnouncementEvent(item.id, "displayed").then(() =>
      queryClient.invalidateQueries({ queryKey: ["received-platform-announcements"] }),
    );
  }, [item.id, queryClient]);
  return (
    <Alert className={item.priority === "urgent" ? "border-destructive/40 bg-destructive/5" : ""}>
      <Megaphone className="size-4" />
      <AlertTitle>{item.title}</AlertTitle>
      <AlertDescription className="flex flex-wrap items-end justify-between gap-3">
        <span>{item.message}</span>
        <AnnouncementActions item={item} />
      </AlertDescription>
    </Alert>
  );
}

function AnnouncementCard({ item }: { item: ReceivedAnnouncement }) {
  const queryClient = useQueryClient();
  useEffect(() => {
    void recordAnnouncementEvent(item.id, "displayed").then(() =>
      queryClient.invalidateQueries({ queryKey: ["received-platform-announcements"] }),
    );
  }, [item.id, queryClient]);
  return (
    <Card className="overflow-hidden">
      {item.image_url && (
        <img src={item.image_url} alt="" className="max-h-64 w-full object-cover" />
      )}
      <CardContent className="p-5">
        <div className="mb-2 flex items-start justify-between gap-3">
          <h2 className="font-bold">{item.title}</h2>
          <PriorityBadge item={item} />
        </div>
        <p className="whitespace-pre-line text-sm text-muted-foreground">{item.message}</p>
        <div className="mt-4">
          <AnnouncementActions item={item} />
        </div>
      </CardContent>
    </Card>
  );
}

function AnnouncementModal({
  item,
  open,
  onDone,
}: {
  item: ReceivedAnnouncement;
  open: boolean;
  onDone(): void;
}) {
  const event = useMutation({
    mutationFn: (kind: "read" | "acknowledged" | "dismissed") =>
      recordAnnouncementEvent(item.id, kind),
    onSuccess: onDone,
    onError: (error) => toast.error(error.message),
  });
  const canClose = item.dismissible && !item.requires_acknowledgement;
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && canClose) event.mutate("dismissed");
      }}
    >
      <DialogContent className="overflow-hidden p-0 sm:max-w-xl">
        {item.image_url && (
          <img src={item.image_url} alt="" className="max-h-72 w-full object-cover" />
        )}
        <div className="p-6">
          <DialogHeader>
            <div className="mb-2">
              <PriorityBadge item={item} />
            </div>
            <DialogTitle>{item.title}</DialogTitle>
            <DialogDescription className="whitespace-pre-line text-sm leading-relaxed">
              {item.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 gap-2">
            {item.action_label && item.action_url && (
              <Button asChild variant="outline">
                <a href={item.action_url}>
                  {item.action_label}
                  <ExternalLink />
                </a>
              </Button>
            )}
            {item.requires_acknowledgement ? (
              <Button onClick={() => event.mutate("acknowledged")} disabled={event.isPending}>
                <Check />
                Confirmar leitura
              </Button>
            ) : (
              <Button onClick={() => event.mutate("read")} disabled={event.isPending}>
                Entendi
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AnnouncementActions({ item }: { item: ReceivedAnnouncement }) {
  const queryClient = useQueryClient();
  const event = useMutation({
    mutationFn: (kind: "read" | "acknowledged" | "dismissed") =>
      recordAnnouncementEvent(item.id, kind),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["received-platform-announcements"] }),
  });
  return (
    <div className="flex flex-wrap gap-2">
      {item.action_label && item.action_url && (
        <Button asChild size="sm" variant="outline">
          <a href={item.action_url}>{item.action_label}</a>
        </Button>
      )}
      {item.requires_acknowledgement && !item.receipt?.acknowledged_at && (
        <Button size="sm" onClick={() => event.mutate("acknowledged")}>
          <Check />
          Confirmar leitura
        </Button>
      )}
      {item.dismissible && !item.requires_acknowledgement && (
        <Button size="sm" variant="ghost" onClick={() => event.mutate("dismissed")}>
          Fechar
        </Button>
      )}
    </div>
  );
}

function PriorityBadge({ item }: { item: ReceivedAnnouncement }) {
  if (item.priority === "normal") return null;
  return (
    <Badge variant={item.priority === "urgent" ? "destructive" : "secondary"}>
      {item.priority === "urgent" ? "Urgente" : "Importante"}
    </Badge>
  );
}
