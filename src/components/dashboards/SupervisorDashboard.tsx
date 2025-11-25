"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Badge } from "../ui/badge";
import {
  Printer,
  ChevronDown,
  ChevronUp,
  LoaderCircle,
  FileDown,
} from "lucide-react";
import { ProductionStatusManager } from "../orders/ProductionStatusManager";
import { ProductionStatusBadge } from "../orders/ProductionStatusBadge";
import { ProductionPrintView } from "../orders/ProductionPrintView";
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

export function SupervisorDashboard() {
  const {
    data: orders,
    error: ordersError,
    isLoading: ordersLoading,
  } = useSWR<Order[]>("/api/orders", fetcher, {
    refreshInterval: 30000, // Atualiza a cada 30 segundos
  });

  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const printRef = useRef<HTMLDivElement>(null);

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

  const handleExportPDF = async () => {
    if (!printRef.current) return;
    setIsExportingPdf(true);

    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;

      const canvas = await html2canvas(printRef.current, {
        scale: 2, // Better quality
        useCORS: true,
        logging: false,
        windowWidth: 1123, // A4 landscape approx in pixels at 96 DPI is 1123
      });

      const imgData = canvas.toDataURL("image/png");

      // A4 dimensions in mm
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

      const dateStr = dateFilter || new Date().toISOString().split("T")[0];
      pdf.save(`pedidos-producao-${dateStr}.pdf`);
    } catch (error) {
      console.error("Error exporting PDF:", error);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const filteredOrders = orders?.filter((order) => {
    if (storeFilter !== "all" && order.store.name !== storeFilter) return false;
    if (dateFilter && !order.createdAt.startsWith(dateFilter)) return false;
    return true;
  });

  const stores = Array.from(
    new Set(orders?.map((order) => order.store.name) || [])
  );

  if (ordersLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (ordersError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-destructive mb-2">Erro ao carregar pedidos</p>
          <Button onClick={() => window.location.reload()}>
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 print:hidden">
        {/* Seção de Pedidos */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold">Pedidos Recebidos</h2>
            <p className="text-muted-foreground">
              Visualize os pedidos de todas as filiais.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleExportPDF}
              variant="outline"
              className="print:hidden"
              disabled={isExportingPdf}
            >
              {isExportingPdf ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <FileDown className="mr-2 h-4 w-4" />
                  Exportar PDF
                </>
              )}
            </Button>
            <Button
              onClick={handlePrintAll}
              className="print:hidden"
              disabled={isPrinting}
            >
              {isPrinting ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
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
        {filteredOrders && filteredOrders.length > 0 ? (
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
                              | "in_progress"
                              | "completed"
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

                      <div className="mt-4">
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
      </div>
      <div className="fixed left-[-10000px] top-0 print:static print:left-0 print:top-0">
        <div ref={printRef} className="w-[297mm] min-h-[210mm] bg-white">
          <ProductionPrintView
            orders={filteredOrders || []}
            dateFilter={dateFilter}
          />
        </div>
      </div>
    </>
  );
}
