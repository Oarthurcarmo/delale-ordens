"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  FileEdit,
  CheckSquare,
  Package,
  BarChart3,
  Settings,
} from "lucide-react";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};

interface SummaryData {
  ordersByStore: Array<{
    storeName: string;
    count: number;
  }>;
  topProducts: Array<{
    productName: string;
    totalQuantity: number;
  }>;
}

export function OwnerDashboard() {
  const { data, error, isLoading } = useSWR<SummaryData>(
    "/api/dashboard/summary",
    fetcher,
    {
      refreshInterval: 60000,
    }
  );

  const { data: editRequests } = useSWR<unknown[]>(
    "/api/edit-requests?status=pending",
    fetcher,
    { refreshInterval: 30000 }
  );

  const { data: itemRequests } = useSWR<unknown[]>(
    "/api/order-item-edit-requests?status=pending",
    fetcher,
    { refreshInterval: 30000 }
  );

  const { data: orders } = useSWR<unknown[]>("/api/orders", fetcher, {
    refreshInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-destructive mb-2">Erro ao carregar dados</p>
        </div>
      </div>
    );
  }

  const totalOrders =
    data?.ordersByStore.reduce((sum, store) => sum + Number(store.count), 0) ||
    0;
  const totalProducts =
    data?.topProducts.reduce(
      (sum, product) => sum + Number(product.totalQuantity),
      0
    ) || 0;

  const quickAccessCards = [
    {
      title: "Visão de Pedidos",
      description: "Visualize e gerencie todos os pedidos",
      count: orders?.length || 0,
      href: "/dashboard/orders-overview",
      icon: Package,
      color: "text-blue-600",
    },
    
    {
      title: "Edições de Itens",
      description: "Aprove edições de itens de pedidos",
      count: itemRequests?.length || 0,
      href: "/dashboard/item-requests",
      icon: CheckSquare,
      color: "text-orange-600",
    },
    {
      title: "Análises e Métricas",
      description: "Veja gráficos e estatísticas detalhadas",
      count: data?.ordersByStore.length || 0,
      href: "/dashboard/analytics",
      icon: BarChart3,
      color: "text-purple-600",
    },
    {
      title: "Administração",
      description: "Gerencie usuários, lojas e produtos",
      count: 0,
      href: "/dashboard/admin",
      icon: Settings,
      color: "text-gray-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Dashboard Geral</h2>
        <p className="text-muted-foreground">
          Visão geral do sistema e acesso rápido às funcionalidades
        </p>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-2">
              De todas as filiais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Produtos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Unidades pedidas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Filiais Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {data?.ordersByStore.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Com pedidos no período
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Acesso Rápido */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Acesso Rápido</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickAccessCards.map((card) => (
            <Link key={card.href} href={card.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <card.icon className={`h-5 w-5 ${card.color}`} />
                        {card.title}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-2">
                        {card.description}
                      </p>
                    </div>
                    {card.count > 0 && (
                      <Badge variant="destructive" className="ml-2">
                        {card.count}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Resumo Rápido */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pedidos por Filial</CardTitle>
          </CardHeader>
          <CardContent>
            {data && data.ordersByStore.length > 0 ? (
              <div className="space-y-2">
                {data.ordersByStore.slice(0, 5).map((store, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-2 rounded hover:bg-muted"
                  >
                    <span className="font-medium">{store.storeName}</span>
                    <Badge variant="outline">{store.count} pedidos</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhum dado disponível
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            {data && data.topProducts.length > 0 ? (
              <div className="space-y-2">
                {data.topProducts.slice(0, 5).map((product, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-2 rounded hover:bg-muted"
                  >
                    <span className="font-medium">{product.productName}</span>
                    <Badge variant="outline">
                      {product.totalQuantity} unidades
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhum dado disponível
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
