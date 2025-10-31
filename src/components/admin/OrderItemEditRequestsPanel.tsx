"use client";

import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Check, X, Trash2, Edit3 } from "lucide-react";
import { toast } from "sonner";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};

interface OrderItemEditRequest {
  id: number;
  orderItemId: number;
  orderId: string;
  originalStock: number;
  originalQuantity: number;
  originalType: string;
  originalClientName?: string;
  originalDeliveryDate?: string;
  newStock: number;
  newQuantity: number;
  newType: string;
  newClientName?: string;
  newDeliveryDate?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  orderItem: {
    product: {
      name: string;
    };
  };
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

export function OrderItemEditRequestsPanel() {
  const {
    data: requests,
    error,
    isLoading,
    mutate,
  } = useSWR<OrderItemEditRequest[]>(
    "/api/order-item-edit-requests?status=pending",
    fetcher,
    { refreshInterval: 30000 }
  );

  const [selectedRequests, setSelectedRequests] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Carregando solicitações...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center">
          <p className="text-destructive mb-2">Erro ao carregar solicitações</p>
          <Button onClick={() => mutate()}>Tentar Novamente</Button>
        </div>
      </div>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Nenhuma solicitação de edição de itens pendente.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Agrupar solicitações por pedido
  const groupedRequests = requests.reduce(
    (acc, request) => {
      const orderCode = request.order.code;
      if (!acc[orderCode]) {
        acc[orderCode] = [];
      }
      acc[orderCode].push(request);
      return acc;
    },
    {} as Record<string, OrderItemEditRequest[]>
  );

  const handleSelectRequest = (requestId: number, checked: boolean) => {
    setSelectedRequests((prev) =>
      checked ? [...prev, requestId] : prev.filter((id) => id !== requestId)
    );
  };

  const handleSelectAll = (orderCode: string, checked: boolean) => {
    const orderRequests = groupedRequests[orderCode];
    const requestIds = orderRequests.map((req) => req.id);

    setSelectedRequests((prev) => {
      if (checked) {
        return [...new Set([...prev, ...requestIds])];
      } else {
        return prev.filter((id) => !requestIds.includes(id));
      }
    });
  };

  const handleBatchDecision = async (decision: "approved" | "rejected") => {
    if (selectedRequests.length === 0) {
      toast.error("Selecione pelo menos uma solicitação");
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch("/api/order-item-edit-requests/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestIds: selectedRequests,
          decision,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        setSelectedRequests([]);
        mutate();
      } else {
        const error = await response.json();
        toast.error(error.message || "Erro ao processar solicitações");
      }
    } catch (error: unknown) {
      console.error("Error processing requests:", error);
      toast.error("Erro ao processar solicitações");
    } finally {
      setIsProcessing(false);
    }
  };

  const isItemDeleted = (request: OrderItemEditRequest) => {
    return request.newQuantity === 0;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  return (
    <Card className="border-yellow-500 border-2">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="destructive">{requests.length}</Badge>
            Solicitações de Edição de Itens Pendentes
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={() => handleBatchDecision("approved")}
              disabled={selectedRequests.length === 0 || isProcessing}
            >
              <Check className="h-4 w-4 mr-1" />
              Aprovar Selecionadas ({selectedRequests.length})
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleBatchDecision("rejected")}
              disabled={selectedRequests.length === 0 || isProcessing}
            >
              <X className="h-4 w-4 mr-1" />
              Rejeitar Selecionadas ({selectedRequests.length})
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Solicitações de edição de itens aguardando aprovação
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(groupedRequests).map(([orderCode, orderRequests]) => {
            const orderInfo = orderRequests[0].order;
            const allOrderSelected = orderRequests.every((req) =>
              selectedRequests.includes(req.id)
            );
            const someOrderSelected = orderRequests.some((req) =>
              selectedRequests.includes(req.id)
            );

            return (
              <Card key={orderCode}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        Pedido: {orderCode}
                      </CardTitle>
                      <CardDescription>
                        {orderInfo.store.name} - {orderInfo.manager.name}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={
                          allOrderSelected
                            ? true
                            : someOrderSelected
                              ? "indeterminate"
                              : false
                        }
                        onCheckedChange={(checked) =>
                          handleSelectAll(orderCode, checked as boolean)
                        }
                      />
                      <span className="text-sm text-muted-foreground">
                        Selecionar todos ({orderRequests.length})
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Estoque</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Data Entrega</TableHead>
                        <TableHead>Solicitante</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderRequests.map((request) => {
                        const isDeleted = isItemDeleted(request);
                        const isSelected = selectedRequests.includes(
                          request.id
                        );

                        return (
                          <TableRow
                            key={request.id}
                            className={
                              isSelected ? "bg-blue-50 dark:bg-blue-950" : ""
                            }
                          >
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) =>
                                  handleSelectRequest(
                                    request.id,
                                    checked as boolean
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {request.orderItem.product.name}
                                {isDeleted && (
                                  <Badge variant="destructive">
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Excluir
                                  </Badge>
                                )}
                                {!isDeleted && (
                                  <Badge variant="default">
                                    <Edit3 className="h-3 w-3 mr-1" />
                                    Editar
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div
                                  className={
                                    request.newStock !== request.originalStock
                                      ? "text-orange-600 font-semibold"
                                      : ""
                                  }
                                >
                                  {request.newStock}
                                </div>
                                {request.newStock !== request.originalStock && (
                                  <div className="text-xs text-muted-foreground">
                                    Original: {request.originalStock}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div
                                  className={`${request.newQuantity !== request.originalQuantity ? "text-orange-600 font-semibold" : ""} ${isDeleted ? "text-red-600" : ""}`}
                                >
                                  {request.newQuantity}
                                </div>
                                {request.newQuantity !==
                                  request.originalQuantity && (
                                  <div className="text-xs text-muted-foreground">
                                    Original: {request.originalQuantity}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div
                                  className={
                                    request.newType !== request.originalType
                                      ? "text-orange-600 font-semibold"
                                      : ""
                                  }
                                >
                                  {request.newType}
                                </div>
                                {request.newType !== request.originalType && (
                                  <div className="text-xs text-muted-foreground">
                                    Original: {request.originalType}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div
                                  className={
                                    request.newClientName !==
                                    request.originalClientName
                                      ? "text-orange-600 font-semibold"
                                      : ""
                                  }
                                >
                                  {request.newClientName || "—"}
                                </div>
                                {request.newClientName !==
                                  request.originalClientName && (
                                  <div className="text-xs text-muted-foreground">
                                    Original:{" "}
                                    {request.originalClientName || "—"}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div
                                  className={
                                    request.newDeliveryDate !==
                                    request.originalDeliveryDate
                                      ? "text-orange-600 font-semibold"
                                      : ""
                                  }
                                >
                                  {request.newDeliveryDate
                                    ? formatDate(request.newDeliveryDate)
                                    : "—"}
                                </div>
                                {request.newDeliveryDate !==
                                  request.originalDeliveryDate && (
                                  <div className="text-xs text-muted-foreground">
                                    Original:{" "}
                                    {request.originalDeliveryDate
                                      ? formatDate(request.originalDeliveryDate)
                                      : "—"}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">
                                {request.requester.name}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">
                                {formatDate(request.createdAt)}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
