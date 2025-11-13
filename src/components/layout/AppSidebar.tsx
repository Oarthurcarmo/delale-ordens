"use client";

import * as React from "react";
import {
  Home,
  ClipboardList,
  BarChart3,
  Package,
  Settings,
  CheckSquare,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth-context";

const managerLinks = [
  { href: "/dashboard", label: "Novo Pedido", icon: Home },
  { href: "/dashboard/orders", label: "Meus Pedidos", icon: ClipboardList },
];

const supervisorLinks = [
  { href: "/dashboard", label: "Pedidos Recebidos", icon: Package },
  {
    href: "/dashboard/item-requests",
    label: "Edições de Itens",
    icon: CheckSquare,
  },
];

const ownerLinks = [
  { href: "/dashboard", label: "Dashboard Geral", icon: BarChart3 },
  {
    href: "/dashboard/orders-overview",
    label: "Visão de Pedidos",
    icon: Package,
  },
  {
    href: "/dashboard/item-requests",
    label: "Edições de Itens",
    icon: CheckSquare,
  },
  {
    href: "/dashboard/analytics",
    label: "Análises e Métricas",
    icon: TrendingUp,
  },
  { href: "/dashboard/admin", label: "Administração", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Carregando...</SidebarGroupLabel>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    );
  }

  let links: { href: string; label: string; icon: React.ElementType }[] = [];
  let roleLabel = "";

  if (user?.role === "manager") {
    links = managerLinks;
    roleLabel = "Gerente";
  } else if (user?.role === "supervisor") {
    links = supervisorLinks;
    roleLabel = "Supervisor";
  } else if (user?.role === "owner") {
    links = ownerLinks;
    roleLabel = "Proprietário";
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Package className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Confeitaria</span>
                  <span className="truncate text-xs">{roleLabel}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {links.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <SidebarMenuItem key={link.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={link.href}>
                        <link.icon />
                        <span>{link.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div className="cursor-default">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-muted">
                  <span className="text-sm font-semibold">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user?.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user?.username}
                  </span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

