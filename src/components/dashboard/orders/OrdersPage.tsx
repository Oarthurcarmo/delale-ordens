"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OrderDetailDialog } from "@/components/orders/OrderDetailDialog";
import { ProductionStatusBadge } from "@/components/orders/ProductionStatusBadge";
import { toast } from "sonner";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};

interface OrderItem {
  id: number;
  product: {
    name: string;
  };
  stock: number;
  quantity: number;
  type: string;
  clientName?: string;
  deliveryDate?: string;
}

interface Order {
  id: string;
  code: string;
  store: {
    name: string;
  };
  manager: {
    name: string;
  };
  createdAt: string;
  items: OrderItem[];
  productionStatus:
    | "awaiting_start"
    | "in_preparation"
    | "in_oven"
    | "cooling"
    | "packaging"
    | "ready_for_pickup"
    | "completed"
    | null;
  productionUpdater?: {
    name: string;
  } | null;
  productionUpdatedAt?: string | null;
}

export function OrdersPage() {
  const {
    data: orders,
    error,
    isLoading,
    mutate,
  } = useSWR<Order[]>("/api/orders", fetcher);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowDetailDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando pedidos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-destructive mb-2">Erro ao carregar pedidos</p>
          <Button onClick={() => mutate()}>Tentar Novamente</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <main>
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Pedidos</CardTitle>
            <CardDescription>
              Aqui você pode ver todos os seus pedidos recentes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {orders && orders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código do Pedido</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead>Data de Criação</TableHead>
                    <TableHead>Total de Itens</TableHead>
                    <TableHead>Status de Produção</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const totalItems = order.items.reduce(
                      (sum, item) => sum + item.quantity,
                      0
                    );
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          {order.code}
                        </TableCell>
                        <TableCell>{order.store.name}</TableCell>
                        <TableCell>
                          {new Date(order.createdAt).toLocaleDateString(
                            "pt-BR"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{totalItems} itens</Badge>
                        </TableCell>
                        <TableCell>
                          <ProductionStatusBadge
                            status={order.productionStatus}
                            size="sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(order)}
                          >
                            Ver Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  Nenhum pedido encontrado.
                </p>
                <Button onClick={() => (window.location.href = "/dashboard")}>
                  Criar Primeiro Pedido
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <OrderDetailDialog
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        order={selectedOrder}
        canRequestEdit={true}
      />
    </div>
  );
}
