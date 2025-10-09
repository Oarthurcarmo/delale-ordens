"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Badge } from "../ui/badge";
import { Printer, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { ProductionStatusManager } from "../orders/ProductionStatusManager";
import { ProductionStatusBadge } from "../orders/ProductionStatusBadge";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

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

interface EditRequest {
  id: number;
  description: string;
  status: string;
  order: {
    code: string;
    store: {
      name: string;
    };
    manager: {
      name: string;
    };
  };
  requester: {
    name: string;
  };
}

export function SupervisorDashboard() {
  const {
    data: orders,
    error: ordersError,
    isLoading: ordersLoading,
    mutate: mutateOrders,
  } = useSWR<Order[]>("/api/orders", fetcher, {
    refreshInterval: 30000, // Atualiza a cada 30 segundos
  });

  const { data: editRequests, mutate: mutateEditRequests } = useSWR<
    EditRequest[]
  >("/api/edit-requests?status=pending", fetcher, {
    refreshInterval: 30000,
  });

  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");

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
    window.print();
  };

  const handlePrintOrder = (order: Order) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const itemsHtml = order.items
      .map(
        (item) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${item.product.name}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${item.quantity}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${item.type}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">
            ${
              item.type === "Encomenda" && item.clientName
                ? `Cliente: ${item.clientName}<br/>Entrega: ${new Date(item.deliveryDate || "").toLocaleDateString("pt-BR")}`
                : "N/A"
            }
          </td>
        </tr>
      `
      )
      .join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Pedido ${order.code}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f0f0f0; padding: 10px; border: 1px solid #ddd; text-align: left; }
            td { padding: 8px; border: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <h1>Pedido ${order.code}</h1>
          <p><strong>Loja:</strong> ${order.store.name}</p>
          <p><strong>Gerente:</strong> ${order.manager.name}</p>
          <p><strong>Data:</strong> ${new Date(order.createdAt).toLocaleString("pt-BR")}</p>
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Quantidade</th>
                <th>Tipo</th>
                <th>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDecideEditRequest = async (
    requestId: number,
    status: "approved" | "rejected"
  ) => {
    try {
      const response = await fetch(`/api/edit-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        toast.success(
          `Solicitação ${status === "approved" ? "aprovada" : "rejeitada"} com sucesso!`
        );
        mutateEditRequests();
      } else {
        toast.error("Erro ao processar solicitação");
      }
    } catch (error) {
      toast.error("Erro ao processar solicitação");
    }
  };

  const filteredOrders = orders?.filter((order) => {
    if (storeFilter !== "all" && order.store.name !== storeFilter) return false;
    if (dateFilter && !order.createdAt.startsWith(dateFilter)) return false;
    return true;
  });

  const stores = orders
    ? Array.from(new Set(orders.map((o) => o.store.name)))
    : [];

  if (ordersLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando pedidos...</p>
        </div>
      </div>
    );
  }

  if (ordersError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-destructive mb-2">Erro ao carregar pedidos</p>
          <Button onClick={() => mutateOrders()}>Tentar Novamente</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Seção de Solicitações de Edição Pendentes */}
      {editRequests && editRequests.length > 0 && (
        <Card className="border-yellow-500 border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge variant="destructive">{editRequests.length}</Badge>
              Solicitações de Edição Pendentes
            </CardTitle>
            <CardDescription>
              Solicitações de edição aguardando sua aprovação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {editRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <p className="font-semibold mb-1">
                          Pedido: {request.order.code}
                        </p>
                        <p className="text-sm text-muted-foreground mb-2">
                          {request.order.store.name} - {request.requester.name}
                        </p>
                        <p className="text-sm bg-muted p-3 rounded-md">
                          {request.description}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() =>
                            handleDecideEditRequest(request.id, "approved")
                          }
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            handleDecideEditRequest(request.id, "rejected")
                          }
                        >
                          <X className="h-4 w-4 mr-1" />
                          Rejeitar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seção de Pedidos */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Pedidos Recebidos</h2>
          <p className="text-muted-foreground">
            Visualize os pedidos de todas as filiais.
          </p>
        </div>
        <Button onClick={handlePrintAll} className="print:hidden">
          <Printer className="mr-2 h-4 w-4" />
          Imprimir Todos
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
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {filteredOrders && filteredOrders.length > 0 ? (
          filteredOrders.map((order) => {
            const isExpanded = expandedOrders.has(order.id);
            const totalItems = order.items.reduce(
              (sum, item) => sum + item.quantity,
              0
            );

            return (
              <Card key={order.id} className="print:break-inside-avoid">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle>{order.code}</CardTitle>
                      <CardDescription>
                        De: {order.store.name} ({order.manager.name}) | Recebido
                        em: {new Date(order.createdAt).toLocaleString("pt-BR")}
                      </CardDescription>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">
                          {totalItems} itens no total
                        </Badge>
                        <ProductionStatusBadge
                          status={order.productionStatus}
                          size="sm"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 print:hidden">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrintOrder(order)}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
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
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead>Qtd</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Detalhes Encomenda</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {order.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.product.name}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
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
                                ? `Cliente: ${item.clientName}, Entrega: ${new Date(item.deliveryDate || "").toLocaleDateString("pt-BR")}`
                                : "N/A"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Gerenciador de Status de Produção */}
                    <div className="mt-6 print:hidden">
                      <ProductionStatusManager
                        orderId={order.id}
                        currentStatus={order.productionStatus}
                        lastUpdatedBy={order.productionUpdater?.name}
                        lastUpdatedAt={order.productionUpdatedAt}
                        onUpdate={() => mutateOrders()}
                      />
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Nenhum pedido encontrado com os filtros aplicados.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* CSS para Impressão */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .space-y-6,
          .space-y-6 * {
            visibility: visible;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:break-inside-avoid {
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
