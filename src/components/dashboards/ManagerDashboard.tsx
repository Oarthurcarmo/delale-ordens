"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { OrderSummaryDialog } from "@/components/orders/OrderSummaryDialog";
import {
  Search,
  ShoppingCart,
  Package,
  X,
  TrendingUp,
  Table as TableIcon,
  LayoutGrid,
  Box,
  User,
  FileText,
  CalendarDays,
  Info,
  Store,
  History,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Product {
  id: number;
  name: string;
  isClassA: boolean;
  allowOrders: boolean;
}

interface OrderItemData {
  productId: number;
  productName: string;
  stock: number;
  quantity: number; // Encomendas
  productionQuantity: number; // Pedidos para Produção
  type: "Vitrine" | "Encomenda";
  clientName?: string;
  deliveryDate?: string;
  observation?: string;
}

interface ProductForecast {
  productId: number;
  forecast: number;
  suggestedProduction: number;
}

interface RecommendationResponse {
  productId: number;
  productName: string;
  forecast: number;
  stock: number;
  orders: number;
  suggestedProduction: number;
}

export function ManagerDashboard() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [orderItems, setOrderItems] = useState<Map<number, OrderItemData>>(
    new Map()
  );
  const [showSummary, setShowSummary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forecasts, setForecasts] = useState<Map<number, ProductForecast>>(
    new Map()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  useEffect(() => {
    fetchProducts();
  }, []);

  // Fetch recommendations only when products are loaded (initial load)
  useEffect(() => {
    if (products.length > 0 && orderItems.size > 0) {
      const items = Array.from(orderItems.values()).map((item) => ({
        productId: item.productId,
        stock: 0, // Initial stock is always 0
        orders: 0, // Initial orders is always 0
      }));

      const fetchRecommendations = async () => {
        try {
          const res = await fetch("/api/recommendations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success && data.recommendations) {
              const newForecasts = new Map<number, ProductForecast>();
              data.recommendations.forEach((rec: RecommendationResponse) => {
                newForecasts.set(rec.productId, {
                  productId: rec.productId,
                  forecast: rec.forecast,
                  suggestedProduction: rec.suggestedProduction,
                });
              });
              setForecasts(newForecasts);
            }
          }
        } catch (error) {
          console.error("Error fetching recommendations:", error);
        }
      };

      fetchRecommendations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.length, orderItems.size]);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data);

        // Inicializar orderItems com valores padrão
        const initialItems = new Map<number, OrderItemData>();
        data.forEach((product: Product) => {
          initialItems.set(product.id, {
            productId: product.id,
            productName: product.name,
            stock: 0,
            quantity: 0,
            productionQuantity: 0,
            type: "Vitrine",
          });
        });
        setOrderItems(initialItems);
      } else {
        toast.error("Erro ao carregar produtos");
      }
    } catch {
      toast.error("Erro ao carregar produtos");
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderItem = (
    productId: number,
    field: keyof OrderItemData,
    value: string | number
  ) => {
    setOrderItems((prev) => {
      const newItems = new Map(prev);
      const item = newItems.get(productId);
      if (item) {
        const updatedItem = { ...item, [field]: value };

        // Definir tipo automaticamente baseado na quantidade de encomendas
        if (field === "quantity") {
          updatedItem.type = (value as number) > 0 ? "Encomenda" : "Vitrine";
        }

        newItems.set(productId, updatedItem);
      }
      return newItems;
    });

    // A sugestão é mantida fixa após ser recebida da API inicialmente
    // Não recalculamos quando estoque ou quantidade mudam para manter a sugestão original
  };

  const handleOpenSummary = () => {
    // Considerar itens que têm estoque, encomendas OU pedidos de produção
    const itemsWithData = Array.from(orderItems.values()).filter(
      (item) =>
        item.stock > 0 || item.quantity > 0 || item.productionQuantity > 0
    );

    if (itemsWithData.length === 0) {
      toast.error("Adicione pelo menos um item ao pedido");
      return;
    }

    // Validar apenas itens do tipo "Encomenda" que têm quantidade > 0
    const itemsWithEncomendas = itemsWithData.filter(
      (item) => item.quantity > 0
    );

    const invalidEncomendas = itemsWithEncomendas.filter(
      (item) =>
        item.type === "Encomenda" &&
        (!item.clientName ||
          item.clientName.trim() === "" ||
          !item.deliveryDate ||
          item.deliveryDate.trim() === "")
    );

    if (invalidEncomendas.length > 0) {
      const productNames = invalidEncomendas
        .map((item) => item.productName)
        .join(", ");
      toast.error(
        `Os seguintes produtos do tipo "Encomenda" precisam ter nome do cliente e data de entrega: ${productNames}`
      );
      return;
    }

    setShowSummary(true);
  };

  const handleSubmitOrder = async () => {
    if (!user?.storeId) {
      toast.error("Erro: Loja não identificada");
      return;
    }

    setIsSubmitting(true);

    try {
      const itemsToSend = Array.from(orderItems.values())
        .filter(
          (item) =>
            item.stock > 0 || item.quantity > 0 || item.productionQuantity > 0
        )
        .map((item) => ({
          productId: item.productId,
          stock: item.stock,
          quantity: item.quantity,
          productionQuantity: item.productionQuantity,
          type: item.type,
          clientName: item.clientName,
          deliveryDate: item.deliveryDate,
          observation: item.observation,
        }));

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: user.storeId,
          items: itemsToSend,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Pedido ${data.order.code} criado com sucesso!`);

        // Resetar formulário
        fetchProducts();
        setShowSummary(false);
        setSearchTerm("");
      } else {
        const error = await response.json();
        console.error("Erro ao criar pedido:", error);
        toast.error(error.message || "Erro ao criar pedido");
      }
    } catch (error) {
      console.error("Erro ao enviar pedido:", error);
      toast.error(
        "Erro ao enviar pedido. Verifique os dados e tente novamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtrar produtos por termo de busca
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [products, searchTerm]);

  // Estatísticas do pedido
  const stats = useMemo(() => {
    const allItems = Array.from(orderItems.values());
    // Considerar itens que têm estoque, encomendas OU pedidos de produção
    const itemsWithData = allItems.filter(
      (item) =>
        item.stock > 0 || item.quantity > 0 || item.productionQuantity > 0
    );
    const totalEncomendas = allItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
    const totalProduction = allItems.reduce(
      (sum, item) => sum + item.productionQuantity,
      0
    );

    return {
      totalItemsWithData: itemsWithData.length,
      totalEncomendas,
      totalProduction,
    };
  }, [orderItems]);

  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date());
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground animate-pulse">
            Carregando catálogo...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-32 max-w-[1600px] mx-auto">
      {/* Cabeçalho Moderno */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 border-b pb-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Nova Ordem de Produção
          </h2>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="capitalize">{formattedDate}</span>
            <span>•</span>
            <span>Loja {user?.storeId}</span>
          </div>
        </div>

        {/* Resumo Rápido */}
        {stats.totalItemsWithData > 0 && (
          <div className="flex items-center gap-6 px-6 py-3 bg-card border rounded-full shadow-sm animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <ShoppingCart className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {stats.totalItemsWithData} Itens
                </p>
                <p className="text-xs text-muted-foreground">selecionados</p>
              </div>
            </div>

            {(stats.totalEncomendas > 0 || stats.totalProduction > 0) && (
              <>
                <div className="h-8 w-px bg-border" />
                <div className="flex gap-6 text-sm">
                  {stats.totalEncomendas > 0 && (
                    <div className="flex flex-col">
                      <span className="font-bold text-foreground">
                        {stats.totalEncomendas}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Encomendas
                      </span>
                    </div>
                  )}
                  {stats.totalProduction > 0 && (
                    <div className="flex flex-col">
                      <span className="font-bold text-foreground">
                        {stats.totalProduction}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Produção
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Barra de Ferramentas Limpa */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-4 z-40 bg-background/80 backdrop-blur-md p-4 rounded-2xl border shadow-sm">
        <div className="relative w-full sm:w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-muted/50 border-transparent focus:bg-background focus:border-input transition-all duration-300 hover:bg-muted/80"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-background/50"
              onClick={() => setSearchTerm("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        <div className="flex bg-muted/50 p-1 rounded-lg border border-transparent hover:border-border transition-colors">
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("table")}
            className={`h-8 px-4 text-xs font-medium transition-all ${viewMode === "table" ? "shadow-sm" : ""}`}
          >
            <TableIcon className="h-3.5 w-3.5 mr-2" />
            Lista
          </Button>
          <Button
            variant={viewMode === "cards" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("cards")}
            className={`h-8 px-4 text-xs font-medium transition-all ${viewMode === "cards" ? "shadow-sm" : ""}`}
          >
            <LayoutGrid className="h-3.5 w-3.5 mr-2" />
            Cards
          </Button>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <TooltipProvider>
        {viewMode === "table" ? (
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-b-primary/10">
                  <TableHead className="w-[28%] font-medium text-xs uppercase tracking-wider text-muted-foreground py-4 pl-6">
                    Produto
                  </TableHead>
                  <TableHead className="w-[10%] text-center font-medium text-xs uppercase tracking-wider text-muted-foreground">
                    <div className="flex items-center justify-center gap-1.5">
                      <Store className="h-3.5 w-3.5" />
                      Estoque
                    </div>
                  </TableHead>
                  <TableHead className="w-[10%] text-center font-medium text-xs uppercase tracking-wider text-muted-foreground">
                    <div className="flex items-center justify-center gap-1.5">
                      <History className="h-3.5 w-3.5" />
                      Previsão
                    </div>
                  </TableHead>
                  <TableHead className="w-[12%] text-center font-medium text-xs uppercase tracking-wider text-muted-foreground">
                    <div className="flex items-center justify-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      Encomendas
                    </div>
                  </TableHead>
                  <TableHead className="w-[12%] text-center font-medium text-xs uppercase tracking-wider text-muted-foreground">
                    <div className="flex items-center justify-center gap-1.5">
                      <Info className="h-3.5 w-3.5" />
                      Sugestão
                    </div>
                  </TableHead>
                  <TableHead className="w-[12%] text-center font-medium text-xs uppercase tracking-wider text-muted-foreground">
                    <div className="flex items-center justify-center gap-1.5">
                      <Package className="h-3.5 w-3.5" />
                      Produzir
                    </div>
                  </TableHead>
                  <TableHead className="w-[16%] text-center font-medium text-xs uppercase tracking-wider text-muted-foreground">
                    Detalhes
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => {
                  const item = orderItems.get(product.id);
                  const forecast = forecasts.get(product.id);
                  const hasQuantity = (item?.quantity || 0) > 0;
                  const hasProduction = (item?.productionQuantity || 0) > 0;
                  const isActive = hasQuantity || hasProduction;

                  // Cores baseadas na primeira letra para dar variedade visual (pseudo-imagem)
                  const colors = [
                    "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400",
                    "bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
                    "bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
                    "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400",
                    "bg-lime-100 text-lime-600 dark:bg-lime-900/20 dark:text-lime-400",
                    "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400",
                    "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
                    "bg-teal-100 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400",
                    "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400",
                    "bg-sky-100 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400",
                    "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
                    "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400",
                    "bg-violet-100 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400",
                    "bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
                    "bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-900/20 dark:text-fuchsia-400",
                    "bg-pink-100 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400",
                    "bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400",
                  ];
                  const colorClass =
                    colors[product.name.charCodeAt(0) % colors.length];

                  return (
                    <TableRow
                      key={product.id}
                      className={`group transition-colors hover:bg-muted/40 ${isActive ? "bg-primary/5" : ""}`}
                    >
                      <TableCell className="py-3 pl-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}
                          >
                            <Box className="h-5 w-5" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-sm text-foreground">
                              {product.name}
                            </span>
                            {product.isClassA && (
                              <Badge
                                variant="outline"
                                className="w-fit text-[10px] px-1.5 py-0 h-5 gap-1 border-amber-200 text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                              >
                                <TrendingUp className="h-2.5 w-2.5" />
                                Classe A
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Estoque Atual */}
                      <TableCell>
                        <div className="flex justify-center relative group/input">
                          <Input
                            type="number"
                            min="0"
                            placeholder="-"
                            value={item?.stock || ""}
                            onChange={(e) => {
                              updateOrderItem(
                                product.id,
                                "stock",
                                parseInt(e.target.value) || 0
                              );
                            }}
                            className="h-9 w-20 text-center bg-transparent border-border/50 focus:bg-background focus:border-primary transition-all peer"
                            autoComplete="off"
                            onFocus={(e) => e.target.select()}
                          />
                          <div className="absolute inset-0 -z-10 bg-muted/20 rounded-md opacity-0 group-hover/input:opacity-100 transition-opacity" />
                        </div>
                      </TableCell>

                      {/* Previsão */}
                      <TableCell>
                        <div className="flex justify-center">
                          <div className="h-9 w-16 flex items-center justify-center rounded-md bg-muted/30 text-sm font-medium text-muted-foreground border border-transparent">
                            {forecast?.forecast || "-"}
                          </div>
                        </div>
                      </TableCell>

                      {/* Encomendas */}
                      <TableCell>
                        <div className="flex justify-center">
                          {product.allowOrders ? (
                            <Input
                              type="number"
                              min="0"
                              placeholder="-"
                              value={item?.quantity || ""}
                              onChange={(e) => {
                                updateOrderItem(
                                  product.id,
                                  "quantity",
                                  parseInt(e.target.value) || 0
                                );
                              }}
                              className={`h-9 w-20 text-center transition-all ${
                                hasQuantity
                                  ? "border-primary ring-1 ring-primary/20 bg-primary/5 font-semibold text-primary"
                                  : "bg-transparent border-border/50 focus:bg-background focus:border-primary"
                              }`}
                              autoComplete="off"
                              onFocus={(e) => e.target.select()}
                            />
                          ) : (
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="text-xs text-muted-foreground/40 select-none cursor-not-allowed flex items-center justify-center w-20 h-9 bg-muted/10 rounded-md">
                                  <X className="h-3 w-3 mr-1" />
                                  N/A
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                Este produto não aceita encomendas
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>

                      {/* Sugestão (ReadOnly) */}
                      <TableCell>
                        <div className="flex justify-center">
                          {forecast && forecast.suggestedProduction > 0 ? (
                            <Badge
                              variant="secondary"
                              className="h-8 px-3 gap-1.5 bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 font-semibold text-sm border border-amber-200 dark:border-amber-800"
                            >
                              <Info className="h-3.5 w-3.5" />
                              <span>{forecast.suggestedProduction}</span>
                              <span className="text-xs opacity-80">un</span>
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground/30">
                              -
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Pedidos para Produção */}
                      <TableCell>
                        <div className="flex justify-center">
                          <Input
                            type="number"
                            min="0"
                            placeholder="-"
                            value={item?.productionQuantity || ""}
                            onChange={(e) => {
                              updateOrderItem(
                                product.id,
                                "productionQuantity",
                                parseInt(e.target.value) || 0
                              );
                            }}
                            className={`h-9 w-20 text-center transition-all ${
                              hasProduction
                                ? "border-emerald-500 ring-1 ring-emerald-500/20 bg-emerald-50 dark:bg-emerald-900/20 font-semibold text-emerald-700 dark:text-emerald-400"
                                : "bg-transparent border-border/50 focus:bg-background focus:border-primary"
                            }`}
                            autoComplete="off"
                            onFocus={(e) => e.target.select()}
                          />
                        </div>
                      </TableCell>

                      {/* Detalhes */}
                      <TableCell className="p-2">
                        {!product.allowOrders ? (
                          <div className="text-center text-xs text-muted-foreground/30">
                            —
                          </div>
                        ) : hasQuantity ? (
                          <div className="space-y-2 min-w-[260px] p-3 bg-background/50 backdrop-blur-sm rounded-lg border shadow-sm animate-in zoom-in-95 duration-200">
                            <div className="flex items-center gap-2 relative">
                              <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                              <Input
                                type="text"
                                placeholder="Nome do cliente *"
                                value={item?.clientName || ""}
                                onChange={(e) =>
                                  updateOrderItem(
                                    product.id,
                                    "clientName",
                                    e.target.value
                                  )
                                }
                                className="h-8 text-xs flex-1 pl-8 bg-muted/30 border-transparent focus:bg-background focus:border-primary"
                              />
                            </div>
                            <div className="flex gap-2">
                              <div className="relative w-36">
                                <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                  type="date"
                                  value={item?.deliveryDate || ""}
                                  onChange={(e) =>
                                    updateOrderItem(
                                      product.id,
                                      "deliveryDate",
                                      e.target.value
                                    )
                                  }
                                  className="h-8 text-xs pl-8 bg-muted/30 border-transparent focus:bg-background focus:border-primary"
                                  min={new Date().toISOString().split("T")[0]}
                                />
                              </div>
                              <div className="relative flex-1">
                                <FileText className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                  type="text"
                                  placeholder="Obs..."
                                  value={item?.observation || ""}
                                  onChange={(e) =>
                                    updateOrderItem(
                                      product.id,
                                      "observation",
                                      e.target.value
                                    )
                                  }
                                  className="h-8 text-xs pl-8 flex-1 bg-muted/30 border-transparent focus:bg-background focus:border-primary"
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-xs text-muted-foreground/30">
                            —
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-muted/10 rounded-3xl border border-dashed border-muted-foreground/25">
            <div className="bg-muted/30 p-6 rounded-full mb-6">
              <Package className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-xl font-bold text-foreground">
              Nenhum produto encontrado
            </h3>
            <p className="text-muted-foreground text-base mt-2 max-w-xs mx-auto">
              Não encontramos nada com &quot;{searchTerm}&quot;. Tente outro
              termo ou limpe a busca.
            </p>
          </div>
        ) : (
          /* CARDS VIEW - Modernizado com "Imagens" */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const item = orderItems.get(product.id);
              const forecast = forecasts.get(product.id);
              const hasQuantity = (item?.quantity || 0) > 0;
              const isActive =
                hasQuantity || (item?.productionQuantity || 0) > 0;

              // Cores para o header do card
              const colors = [
                "from-red-500/10 to-red-500/5 text-red-600",
                "from-orange-500/10 to-orange-500/5 text-orange-600",
                "from-amber-500/10 to-amber-500/5 text-amber-600",
                "from-yellow-500/10 to-yellow-500/5 text-yellow-600",
                "from-lime-500/10 to-lime-500/5 text-lime-600",
                "from-green-500/10 to-green-500/5 text-green-600",
                "from-emerald-500/10 to-emerald-500/5 text-emerald-600",
                "from-teal-500/10 to-teal-500/5 text-teal-600",
                "from-cyan-500/10 to-cyan-500/5 text-cyan-600",
                "from-sky-500/10 to-sky-500/5 text-sky-600",
                "from-blue-500/10 to-blue-500/5 text-blue-600",
                "from-indigo-500/10 to-indigo-500/5 text-indigo-600",
                "from-violet-500/10 to-violet-500/5 text-violet-600",
                "from-purple-500/10 to-purple-500/5 text-purple-600",
                "from-fuchsia-500/10 to-fuchsia-500/5 text-fuchsia-600",
                "from-pink-500/10 to-pink-500/5 text-pink-600",
                "from-rose-500/10 to-rose-500/5 text-rose-600",
              ];
              const colorIndex = product.name.charCodeAt(0) % colors.length;
              const bgClass = colors[colorIndex];

              return (
                <div
                  key={product.id}
                  className={`group relative bg-card rounded-2xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 overflow-hidden flex flex-col ${
                    isActive
                      ? "ring-1 ring-primary border-primary/20 shadow-md"
                      : "hover:border-primary/30"
                  }`}
                >
                  {/* Header Visual com Placeholder de Imagem */}
                  <div
                    className={`h-24 bg-gradient-to-br ${bgClass} flex items-center justify-center relative`}
                  >
                    <div className="absolute inset-0 bg-white/40 dark:bg-black/20 backdrop-blur-[1px]" />
                    <Box className="h-10 w-10 opacity-80 relative z-10" />

                    {product.isClassA && (
                      <div className="absolute top-3 right-3 z-20">
                        <Badge
                          variant="secondary"
                          className="gap-1 bg-white/90 dark:bg-black/80 backdrop-blur shadow-sm text-[10px] font-bold border-0"
                        >
                          <TrendingUp className="h-3 w-3 text-amber-500" />
                          CLASSE A
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <div className="mb-4">
                      <h3
                        className="font-bold text-lg text-foreground line-clamp-1"
                        title={product.name}
                      >
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        
                        {/* Previsão */}
                        {forecast && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50/80 border border-blue-200/60 dark:bg-blue-950/30 dark:border-blue-900/50">
                            <History className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                              Previsão:
                            </span>
                            <span className="text-sm font-bold text-blue-900 dark:text-blue-100">
                              {forecast.forecast || 0}
                            </span>
                          </div>
                        )}
                        {/* Sugestão */}
                        {forecast && forecast.suggestedProduction > 0 && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50/80 border border-amber-200/60 dark:bg-amber-950/30 dark:border-amber-900/50">
                            <Info className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                            <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                              Sugestão:
                            </span>
                            <span className="text-sm font-bold text-amber-900 dark:text-amber-100">
                              {forecast.suggestedProduction}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-5 flex-1">
                      {/* Inputs Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Estoque */}
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Store className="h-3.5 w-3.5" />
                            Estoque
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="-"
                            value={item?.stock || ""}
                            onChange={(e) =>
                              updateOrderItem(
                                product.id,
                                "stock",
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="bg-muted/30 border-transparent focus:bg-background focus:border-primary text-center font-medium h-10"
                          />
                        </div>

                        {/* Produção Manual */}
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Package className="h-3.5 w-3.5" />
                            Produzir
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="-"
                            value={item?.productionQuantity || ""}
                            onChange={(e) =>
                              updateOrderItem(
                                product.id,
                                "productionQuantity",
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="bg-emerald-50/50 border-emerald-100 focus:border-emerald-500 focus:ring-emerald-500/20 text-center font-medium h-10 dark:bg-emerald-900/10 dark:border-emerald-900/30"
                          />
                        </div>
                      </div>

                      {/* Seção de Encomenda */}
                      <div className="pt-2 space-y-3 border-t border-dashed">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5" />
                            Encomenda
                          </Label>
                          {!product.allowOrders && (
                            <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground/60 italic">
                              Indisponível
                            </span>
                          )}
                        </div>

                        {product.allowOrders ? (
                          <div className="space-y-3">
                            <Input
                              type="number"
                              min="0"
                              placeholder="Qtd. Encomenda"
                              value={item?.quantity || ""}
                              onChange={(e) =>
                                updateOrderItem(
                                  product.id,
                                  "quantity",
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className={`h-10 text-center font-medium transition-all ${
                                hasQuantity
                                  ? "bg-primary/5 border-primary text-primary"
                                  : "bg-muted/30 border-transparent focus:bg-background focus:border-primary"
                              }`}
                            />

                            {hasQuantity && (
                              <div className="bg-muted/40 rounded-lg p-3 space-y-2.5 animate-in slide-in-from-top-2 border border-primary/10">
                                <div className="relative">
                                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                  <Input
                                    type="text"
                                    placeholder="Nome do Cliente *"
                                    className="h-9 text-xs pl-9 bg-background border-border/50"
                                    value={item?.clientName || ""}
                                    onChange={(e) =>
                                      updateOrderItem(
                                        product.id,
                                        "clientName",
                                        e.target.value
                                      )
                                    }
                                  />
                                </div>

                                <div className="relative">
                                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                  <Input
                                    type="date"
                                    className="h-9 text-xs pl-9 bg-background border-border/50"
                                    value={item?.deliveryDate || ""}
                                    onChange={(e) =>
                                      updateOrderItem(
                                        product.id,
                                        "deliveryDate",
                                        e.target.value
                                      )
                                    }
                                    min={new Date().toISOString().split("T")[0]}
                                  />
                                </div>

                                <div className="relative">
                                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                  <Input
                                    type="text"
                                    placeholder="Observação (opcional)"
                                    className="h-9 text-xs pl-9 bg-background border-border/50"
                                    value={item?.observation || ""}
                                    onChange={(e) =>
                                      updateOrderItem(
                                        product.id,
                                        "observation",
                                        e.target.value
                                      )
                                    }
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="h-10 flex items-center justify-center bg-muted/20 rounded-md border border-dashed text-xs text-muted-foreground">
                            Produto não aceita encomendas
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </TooltipProvider>

      {/* Botão Flutuante Moderno */}
      {stats.totalItemsWithData > 0 && (
        <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-bottom-8 fade-in duration-500">
          <Button
            onClick={handleOpenSummary}
            size="lg"
            className="h-16 pl-6 pr-8 rounded-full shadow-2xl shadow-primary/30 bg-primary hover:bg-primary/90 transition-all hover:scale-105 hover:-translate-y-1 group"
          >
            <div className="relative mr-4">
              <div className="bg-white/20 p-2.5 rounded-full">
                <ShoppingCart className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-primary shadow-sm">
                {stats.totalItemsWithData}
              </span>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-base font-bold tracking-wide text-primary-foreground">
                Revisar Pedido
              </span>
              <span className="text-[10px] font-medium text-primary-foreground/80 uppercase tracking-wider group-hover:text-white transition-colors">
                {stats.totalEncomendas > 0
                  ? `${stats.totalEncomendas} encomendas`
                  : "Pronto para enviar"}
              </span>
            </div>
          </Button>
        </div>
      )}

      {/* Dialog de Resumo */}
      <OrderSummaryDialog
        open={showSummary}
        onOpenChange={setShowSummary}
        items={Array.from(orderItems.values()).filter(
          (item) =>
            item.stock > 0 || item.quantity > 0 || item.productionQuantity > 0
        )}
        onConfirm={handleSubmitOrder}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
