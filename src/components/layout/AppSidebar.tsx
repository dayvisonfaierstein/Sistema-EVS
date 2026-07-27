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
  Truck,
  PartyPopper,
  Megaphone,
  FileBarChart,
  Shield,
  Settings,
} from "lucide-react";
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

const principal = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Avaliações", url: "/avaliacoes", icon: ClipboardList },
  { title: "Acessos", url: "/acessos", icon: LogIn },
  { title: "Agenda", url: "/agenda", icon: Calendar },
];
const comercial = [
  { title: "Vendas (PDV)", url: "/vendas", icon: ShoppingCart },
  { title: "Produtos", url: "/produtos", icon: Package },
  { title: "Estoque", url: "/estoque", icon: Box },
  { title: "Financeiro", url: "/financeiro", icon: Wallet },
  { title: "Fornecedores", url: "/fornecedores", icon: Truck },
];
const engajamento = [
  { title: "Eventos", url: "/eventos", icon: PartyPopper },
  { title: "Campanhas", url: "/campanhas", icon: Megaphone },
  { title: "Relatórios", url: "/relatorios", icon: FileBarChart },
];
const sistema = [
  { title: "Usuários", url: "/usuarios", icon: Shield },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

function Group({ label, items }: { label: string; items: typeof principal }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
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
            src="/images/logo-espaco-mais-icon.png"
            alt="Espaço+"
            className="size-9 shrink-0 rounded-xl object-contain"
          />
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-bold leading-tight">Espaço+</div>
              <div className="truncate text-[11px] text-muted-foreground">Sistema de Gestão</div>
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
