import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  LogIn,
  Calendar,
  ShoppingCart,
  Package,
  Wallet,
  Box,
  PartyPopper,
  Megaphone,
  FileBarChart,
  Shield,
  Settings,
  CookingPot,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { APP_VERSION_LABEL } from "@/lib/version";
import { useAuth } from "@/contexts/AuthContext";

type MenuItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  permissions: string[];
};

const principal: MenuItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, permissions: ["dashboard.view"] },
  { title: "Clientes", url: "/clientes", icon: Users, permissions: ["clients.view"] },
  {
    title: "Avaliações",
    url: "/avaliacoes",
    icon: ClipboardList,
    permissions: ["assessments.view", "assessments.create"],
  },
  {
    title: "Acessos",
    url: "/acessos",
    icon: LogIn,
    permissions: ["accesses.view", "accesses.create"],
  },
  { title: "Agenda", url: "/agenda", icon: Calendar, permissions: ["agenda.view"] },
];
const comercial: MenuItem[] = [
  {
    title: "Vendas (PDV)",
    url: "/vendas",
    icon: ShoppingCart,
    permissions: ["sales.view", "sales.create"],
  },
  { title: "Produtos", url: "/produtos", icon: Package, permissions: ["products.view"] },
  { title: "Estoque", url: "/estoque", icon: Box, permissions: ["inventory.view"] },
  { title: "Receitas", url: "/receitas", icon: CookingPot, permissions: ["recipes.view"] },
  { title: "Financeiro", url: "/financeiro", icon: Wallet, permissions: ["finance.view"] },
];
const engajamento: MenuItem[] = [
  { title: "Eventos", url: "/eventos", icon: PartyPopper, permissions: ["events.view"] },
  {
    title: "Campanhas",
    url: "/campanhas",
    icon: Megaphone,
    permissions: ["campaigns.view"],
  },
  {
    title: "Relatórios",
    url: "/relatorios",
    icon: FileBarChart,
    permissions: [
      "reports.clients",
      "reports.assessments",
      "reports.accesses",
      "reports.sales",
      "reports.inventory",
      "reports.finance",
    ],
  },
];
const sistema: MenuItem[] = [
  { title: "Usuários", url: "/usuarios", icon: Shield, permissions: ["users.view"] },
  {
    title: "Configurações",
    url: "/configuracoes",
    icon: Settings,
    permissions: [
      "settings.organization",
      "settings.permissions",
      "settings.integrations",
      "settings.subscription.view",
      "audit.view",
    ],
  },
];

function Group({ label, items }: { label: string; items: MenuItem[] }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { hasPermission } = useAuth();
  const visibleItems = items.filter((item) => item.permissions.some(hasPermission));
  if (!visibleItems.length) return null;
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {visibleItems.map((item) => {
            const active = path === item.url || (item.url !== "/" && path.startsWith(item.url));
            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                  <Link to={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <img
            src="/images/logo-espaco-mais-dashboard.png"
            alt="Espaço+"
            className="size-10 shrink-0 object-contain"
          />
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-bold leading-tight">Espaço+</div>
              <div className="text-[9px] leading-tight text-muted-foreground">
                Gestão Inteligente para transformar resultados
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <Group label="Principal" items={principal} />
        <Group label="Comercial" items={comercial} />
        <Group label="Engajamento" items={engajamento} />
        <Group label="Sistema" items={sistema} />
      </SidebarContent>
      <SidebarFooter>
        <div
          className="px-3 py-2 text-center text-[10px] text-muted-foreground"
          title={`Espaço+ ${APP_VERSION_LABEL}`}
        >
          {collapsed ? APP_VERSION_LABEL : `Espaço+ • ${APP_VERSION_LABEL}`}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
