"use client";

import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Printer, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { ProductionStatusBadge } from "@/components/orders/ProductionStatusBadge";
import { ProductionStatusManager } from "@/components/orders/ProductionStatusManager";
import { OrderDetailDialog } from "@/components/orders/OrderDetailDialog";

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
  productionQuantity?: number;
  type: "Vitrine" | "Encomenda";
  clientName?: string;
  deliveryDate?: string;
  observation?: string;
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
  productionStatus: "awaiting_start" | "in_progress" | "completed" | null;
  productionUpdater?: {
    name: string;
  } | null;
  productionUpdatedAt?: string | null;
}

export default function OrdersOverviewPage() {
  const { user } = useAuth();
  const {
    data: orders,
    error: ordersError,
    isLoading: ordersLoading,
  } = useSWR<Order[]>("/api/orders", fetcher, {
    refreshInterval: 30000,
  });

  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const handlePrintAll = () => {
    setIsPrinting(true);

    // Pequeno delay para mostrar o feedback visual
    setTimeout(() => {
      window.print();

      // Reset do estado após a janela de impressão
      setTimeout(() => {
        setIsPrinting(false);
      }, 500);
    }, 300);
  };

  const handleViewOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetail(true);
  };

  const filteredOrders = orders?.filter((order) => {
    if (storeFilter !== "all" && order.store.name !== storeFilter) return false;
    if (dateFilter && !order.createdAt.startsWith(dateFilter)) return false;
    return true;
  });

  const stores = Array.from(
    new Set(orders?.map((order) => order.store.name) || [])
  );

  if (!user || user.role !== "owner") {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Acesso Negado</h1>
          <p className="text-muted-foreground">
            Apenas o dono pode acessar esta página.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Visão Geral de Pedidos</h2>
          <p className="text-muted-foreground">
            Visualize e gerencie todos os pedidos de todas as filiais
          </p>
        </div>
        <Button
          onClick={handlePrintAll}
          className="print:hidden"
          disabled={isPrinting}
        >
          {isPrinting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Preparando...
            </>
          ) : (
            <>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir Todos
            </>
          )}
        </Button>
      </div>

      {/* Filtros */}
      <Card className="print:hidden">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">
                Filtrar por Loja
              </label>
              <Select value={storeFilter} onValueChange={setStoreFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Lojas</SelectItem>
                  {stores.map((store) => (
                    <SelectItem key={store} value={store}>
                      {store}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">
                Filtrar por Data
              </label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                placeholder="Filtrar por data..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Pedidos */}
      {ordersLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Carregando pedidos...</p>
          </div>
        </div>
      ) : ordersError ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <p className="text-destructive mb-2">Erro ao carregar pedidos</p>
          </div>
        </div>
      ) : filteredOrders && filteredOrders.length > 0 ? (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isExpanded = expandedOrders.has(order.id);
            const totalItems = order.items.reduce(
              (sum, item) => sum + item.quantity,
              0
            );

            return (
              <Card key={order.id} className="print:break-inside-avoid">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        Pedido {order.code}
                        <Badge variant="outline">{totalItems} itens</Badge>
                      </CardTitle>
                      <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                        <span>{order.store.name}</span>
                        <span>•</span>
                        <span>{order.manager.name}</span>
                        <span>•</span>
                        <span>
                          {new Date(order.createdAt).toLocaleDateString(
                            "pt-BR"
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ProductionStatusBadge
                        status={
                          order.productionStatus as
                            | "awaiting_start"
                            | "completed"
                            | "in_progress"
                            | null
                        }
                        size="sm"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleOrderExpansion(order.id)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewOrderDetails(order)}
                        >
                          Ver Detalhes
                        </Button>
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produto</TableHead>
                            <TableHead>Estoque</TableHead>
                            <TableHead>Encomendas</TableHead>
                            <TableHead>Produção</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Data Entrega</TableHead>
                            <TableHead>Observação</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {order.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">
                                {item.product.name}
                              </TableCell>
                              <TableCell>{item.stock}</TableCell>
                              <TableCell className="font-bold text-purple-600">
                                {item.quantity}
                              </TableCell>
                              <TableCell className="font-bold text-green-600">
                                {item.productionQuantity || 0}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    item.type === "Encomenda"
                                      ? "destructive"
                                      : "secondary"
                                  }
                                >
                                  {item.type}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {item.type === "Encomenda" && item.clientName
                                  ? item.clientName
                                  : "—"}
                              </TableCell>
                              <TableCell>
                                {item.type === "Encomenda" && item.deliveryDate
                                  ? new Date(
                                      item.deliveryDate
                                    ).toLocaleDateString("pt-BR")
                                  : "—"}
                              </TableCell>
                              <TableCell>
                                {item.type === "Encomenda" && item.observation
                                  ? item.observation
                                  : "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      <ProductionStatusManager
                        orderId={order.id}
                        currentStatus={
                          order.productionStatus as
                            | "awaiting_start"
                            | "in_progress"
                            | "completed"
                            | null
                        }
                      />
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Nenhum pedido encontrado para os filtros selecionados.
          </p>
        </div>
      )}

      {/* Diálogo de Detalhes do Pedido */}
      <OrderDetailDialog
        open={showOrderDetail}
        onOpenChange={setShowOrderDetail}
        order={selectedOrder}
        canRequestEdit={true}
      />
    </div>
  );
}
