"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OrderDetailDialog } from "@/components/orders/OrderDetailDialog";
import { ProductionStatusBadge } from "@/components/orders/ProductionStatusBadge";
import {
  CalendarDays,
  Package,
  ShoppingCart,
  ChevronRight,
  Clock,
  Store,
  Search,
  Filter
} from "lucide-react";
import { Input } from "@/components/ui/input";

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
  productionQuantity: number;
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

export function OrdersPage() {
  const {
    data: orders,
    error,
    isLoading,
    mutate,
  } = useSWR<Order[]>("/api/orders", fetcher);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowDetailDialog(true);
  };

  const filteredOrders = orders?.filter(order => 
    order.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.store.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground animate-pulse">Carregando histórico...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <div className="bg-destructive/10 p-4 rounded-full inline-flex">
            <Package className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold">Erro ao carregar pedidos</h3>
          <Button onClick={() => mutate()} variant="outline">
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 max-w-[1600px] mx-auto">
      {/* Cabeçalho Moderno */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 border-b pb-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Histórico de Pedidos
          </h2>
          <p className="text-muted-foreground">
            Acompanhe o status e detalhes das suas solicitações recentes
          </p>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar pedido..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-muted/30 border-transparent focus:bg-background focus:border-primary transition-all"
              />
           </div>
        </div>
      </div>

      {filteredOrders && filteredOrders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredOrders.map((order) => {
            const totalItems = order.items.reduce(
              (sum, item) => sum + item.quantity,
              0
            );
            const totalProduction = order.items.reduce(
              (sum, item) => sum + (item.productionQuantity || 0),
              0
            );
            const hasProduction = totalProduction > 0;
            
            return (
              <div
                key={order.id}
                className="group relative bg-card rounded-2xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 overflow-hidden flex flex-col"
              >
                {/* Header do Card */}
                <div className="p-5 border-b bg-muted/10 flex justify-between items-start">
                   <div className="space-y-1">
                      <div className="flex items-center gap-2">
                         <Badge variant="outline" className="bg-background font-mono text-xs tracking-wider">
                            #{order.code}
                         </Badge>
                         <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                         </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                         <Store className="h-3.5 w-3.5" />
                         {order.store.name}
                      </div>
                   </div>
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
                </div>

                {/* Corpo do Card */}
                <div className="p-5 flex-1 space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1 p-3 rounded-xl bg-primary/5 border border-primary/10">
                         <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Itens</p>
                         <div className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4 text-primary" />
                            <span className="text-xl font-bold text-primary">{totalItems}</span>
                         </div>
                      </div>
                      <div className={`space-y-1 p-3 rounded-xl border ${hasProduction ? 'bg-amber-50/50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/30' : 'bg-muted/20 border-border/50'}`}>
                         <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Para Produção</p>
                         <div className="flex items-center gap-2">
                            <Package className={`h-4 w-4 ${hasProduction ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`} />
                            <span className={`text-xl font-bold ${hasProduction ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground'}`}>{totalProduction}</span>
                         </div>
                      </div>
                   </div>
                   
                   <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Criado às {new Date(order.createdAt).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}</span>
                   </div>
                </div>

                {/* Footer / Ação */}
                <div className="p-4 bg-muted/5 border-t mt-auto">
                   <Button 
                     className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors" 
                     variant="outline"
                     onClick={() => handleViewDetails(order)}
                   >
                      Ver Detalhes Completos
                      <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                   </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-muted/10 rounded-3xl border border-dashed border-muted-foreground/25">
          <div className="bg-muted/30 p-6 rounded-full mb-6">
            <Package className="h-10 w-10 text-muted-foreground/50" />
          </div>
          <h3 className="text-xl font-bold text-foreground">
            {searchTerm ? "Nenhum pedido encontrado" : "Nenhum pedido realizado"}
          </h3>
          <p className="text-muted-foreground text-base mt-2 max-w-xs mx-auto">
            {searchTerm 
              ? `Não encontramos pedidos com o código "${searchTerm}".` 
              : "Você ainda não realizou nenhum pedido. Crie um novo pedido para começar."}
          </p>
          {!searchTerm && (
             <Button className="mt-6" onClick={() => (window.location.href = "/dashboard")}>
               Criar Primeiro Pedido
             </Button>
          )}
        </div>
      )}

      <OrderDetailDialog
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        order={selectedOrder}
        canRequestEdit={true}
      />
    </div>
  );
}
