import { Link } from "@tanstack/react-router";
import { Bell, LogOut, Search, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";

export function AppHeader() {
  const { profile, signOut, configured } = useAuth();
  const role =
    profile?.role === "administrator" ? "Administrador" : (profile?.role ?? "Ambiente local");
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
        <div className="text-sm font-semibold text-foreground">
          Espaço Vida Saudável — Unidade Centro
        </div>
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
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback>
                {profile?.full_name?.slice(0, 2).toUpperCase() ?? "E+"}
              </AvatarFallback>
            </Avatar>
            <div className="hidden text-left sm:block">
              <div className="text-sm font-semibold leading-tight">
                {profile?.full_name ?? "Espaço+"}
              </div>
              <div className="text-[11px] text-muted-foreground">{role}</div>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
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
    </header>
  );
}
