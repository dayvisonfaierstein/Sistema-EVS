import { Link, useRouterState } from "@tanstack/react-router";
import {
  Building2,
  CreditCard,
  FileClock,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { APP_VERSION_LABEL } from "@/lib/version";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Visão global", href: "/admin", icon: LayoutDashboard },
  { label: "Organizações", href: "/admin/organizacoes", icon: Building2 },
  { label: "Planos", href: "/admin/planos", icon: PackageCheck },
  { label: "Assinaturas", href: "/admin/assinaturas", icon: CreditCard },
  { label: "Auditoria", href: "/admin/auditoria", icon: FileClock },
] as const;

function AdminNavigation({ compact = false }: { compact?: boolean }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <nav className={cn("space-y-1", compact && "space-y-0")}>
      {navigation.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin" || pathname === "/admin/"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  async function logout() {
    try {
      await signOut();
    } catch {
      toast.error("Não foi possível encerrar a sessão.");
    }
  }

  return (
    <div className="min-h-screen bg-muted/25">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-background lg:flex lg:flex-col">
        <div className="flex h-20 items-center gap-3 border-b px-5">
          <img
            src="/images/logo-espaco-mais-dashboard.png"
            alt="Espaço+"
            className="size-11 object-contain"
          />
          <div>
            <div className="font-bold leading-tight">Espaço+ Admin</div>
            <div className="text-xs text-muted-foreground">Administração da plataforma</div>
          </div>
        </div>
        <div className="flex-1 p-4">
          <div className="mb-3 flex items-center gap-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <ShieldCheck className="size-4 text-primary" />
            Super Admin
          </div>
          <AdminNavigation />
        </div>
        <div className="border-t p-4">
          <div className="mb-3 truncate px-2 text-xs text-muted-foreground">{profile?.email}</div>
          <Button variant="outline" className="w-full justify-start" onClick={() => void logout()}>
            <LogOut />
            Sair
          </Button>
          <div className="mt-3 text-center text-[10px] text-muted-foreground">
            Espaço+ • {APP_VERSION_LABEL}
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur sm:px-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 p-2">
              <AdminNavigation compact />
              <DropdownMenuItem className="mt-2" onClick={() => void logout()}>
                <LogOut />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <span className="text-sm font-semibold">Central administrativa</span>
          </div>
          <div className="ml-auto text-right">
            <div className="text-sm font-semibold">{profile?.full_name ?? "Super Admin"}</div>
            <div className="text-[11px] text-muted-foreground">Visão de toda a plataforma</div>
          </div>
        </header>
        <main className="p-4 sm:p-6 xl:p-8">{children}</main>
      </div>
    </div>
  );
}
