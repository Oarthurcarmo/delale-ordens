"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ClipboardList,
  BarChart3,
  Package,
  Settings,
  FileEdit,
  CheckSquare,
  TrendingUp,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "@/lib/auth-context";

const managerLinks = [
  { href: "/dashboard", label: "Novo Pedido", icon: Home },
  { href: "/dashboard/orders", label: "Meus Pedidos", icon: ClipboardList },
  { href: "/dashboard/insights", label: "Insights Diários", icon: TrendingUp },
  /*{
    href: "/dashboard/sales-history",
    label: "Histórico de Vendas",
    icon: BarChart3,
  },*/
];

const supervisorLinks = [
  { href: "/dashboard", label: "Pedidos Recebidos", icon: Package },
  {
    href: "/dashboard/edit-requests",
    label: "Solicitações de Edição",
    icon: FileEdit,
  },
  {
    href: "/dashboard/item-requests",
    label: "Edições de Itens",
    icon: CheckSquare,
  },
  { href: "/dashboard/insights", label: "Insights Diários", icon: TrendingUp },
];

const ownerLinks = [
  { href: "/dashboard", label: "Dashboard Geral", icon: BarChart3 },
  {
    href: "/dashboard/orders-overview",
    label: "Visão de Pedidos",
    icon: Package,
  },
  {
    href: "/dashboard/edit-requests",
    label: "Solicitações de Edição",
    icon: FileEdit,
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

export function Sidebar() {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <aside className="w-64 flex-shrink-0 bg-card border-r">
        <div className="flex flex-col h-full">
          <div className="p-4 border-b">
            <div className="h-6 bg-muted animate-pulse rounded"></div>
          </div>
        </div>
      </aside>
    );
  }

  let links: { href: string; label: string; icon: React.ElementType }[] = [];
  if (user?.role === "manager") {
    links = managerLinks;
  } else if (user?.role === "supervisor") {
    links = supervisorLinks;
  } else if (user?.role === "owner") {
    links = ownerLinks;
  }

  return (
    <aside className="w-64 flex-shrink-0 bg-card border-r">
      <div className="flex flex-col h-full">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold">Menu</h2>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {links.map(
            (link: {
              href: string;
              label: string;
              icon: React.ElementType;
            }) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  pathname === link.href
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <link.icon className="mr-3 h-5 w-5" />
                {link.label}
              </Link>
            )
          )}
        </nav>
      </div>
    </aside>
  );
}
