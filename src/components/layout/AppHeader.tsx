import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, LogOut, Search, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabase } from "@/integrations/supabase/client";
import type { Profile } from "@/types/database";

export function AppHeader() {
  const { profile, environment, signOut, configured } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const organization = useQuery({
    queryKey: ["header-organization", profile?.organization_id],
    enabled: Boolean(configured && profile?.organization_id),
    queryFn: async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("organizations")
        .select("trade_name,logo_url")
        .eq("id", profile!.organization_id!)
        .single();
      if (error) throw error;
      if (!data.logo_url) return { name: data.trade_name, logoUrl: null };
      const { data: signed, error: signedError } = await supabase.storage
        .from("organization-logos")
        .createSignedUrl(data.logo_url, 3600);
      return {
        name: data.trade_name,
        logoUrl: signedError ? null : signed.signedUrl,
      };
    },
  });
  const organizationName =
    organization.data?.name ?? environment?.organizationName ?? "Espaço Vida Saudável";
  async function logout() {
    try {
      if (configured) await signOut();
    } catch {
      toast.error("Não foi possível encerrar a sessão.");
    }
  }
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-3 backdrop-blur sm:px-6">
      <SidebarTrigger className="shrink-0" />
      <div className="hidden min-w-0 items-center gap-2 sm:flex">
        <div className="text-sm font-semibold text-foreground">Espaço Vida Saudável</div>
      </div>
      <div className="relative ml-auto hidden max-w-sm flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar clientes, produtos..." className="pl-9" />
      </div>
      <Button variant="ghost" size="icon" className="relative shrink-0">
        <Bell className="size-5" />
        <Badge className="absolute -right-1 -top-1 h-4 min-w-4 rounded-full px-1 text-[10px]">
          3
        </Badge>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex shrink-0 items-center gap-2 rounded-full pl-1 pr-2 hover:bg-accent">
            <Avatar className="size-9">
              <AvatarImage
                src={organization.data?.logoUrl ?? undefined}
                alt={`Logo de ${organizationName}`}
              />
              <AvatarFallback>{organizationName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="hidden text-left sm:block">
              <div className="max-w-48 truncate text-sm font-semibold leading-tight">
                {organizationName}
              </div>
              <div className="text-[11px] text-muted-foreground">Espaço Vida Saudável</div>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setProfileOpen(true)}>
            <User className="mr-2 size-4" />
            Perfil
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/portal">
              <User className="mr-2 size-4" />
              Ver como cliente
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/login" onClick={logout}>
              <LogOut className="mr-2 size-4" />
              Sair
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ProfileDialog open={profileOpen} profile={profile} onOpenChange={setProfileOpen} />
    </header>
  );
}

function ProfileDialog({
  open,
  profile,
  onOpenChange,
}: {
  open: boolean;
  profile: Profile | null;
  onOpenChange(open: boolean): void;
}) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
  }, [open, profile]);

  async function save() {
    if (!profile || fullName.trim().length < 3) {
      toast.error("Informe seu nome completo.");
      return;
    }
    setSaving(true);
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
        })
        .eq("id", profile.id);
      if (error) throw error;
      await supabase.auth.refreshSession();
      toast.success("Perfil atualizado.");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o perfil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Meu perfil</DialogTitle>
          <DialogDescription>
            Atualize seus dados pessoais. Permissões e acesso são controlados pelo administrador.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="profile-full-name">Nome completo</Label>
            <Input
              id="profile-full-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-phone">Telefone</Label>
            <Input
              id="profile-phone"
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-email">E-mail de acesso</Label>
            <Input id="profile-email" value={profile?.email ?? ""} disabled />
            <p className="text-xs text-muted-foreground">
              O e-mail de acesso deve ser alterado por um administrador.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Salvando..." : "Salvar perfil"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
