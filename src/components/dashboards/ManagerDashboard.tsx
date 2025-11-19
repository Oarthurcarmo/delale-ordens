"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Check,
  TrendingUp,
  Table as TableIcon,
  LayoutGrid,
} from "lucide-react";

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

    // Recalculate production suggestion when stock or quantity (encomendas) changes
    if (field === "stock" || field === "quantity") {
      setForecasts((prev) => {
        const newForecasts = new Map(prev);
        const forecast = newForecasts.get(productId);
        const item = orderItems.get(productId);

        if (forecast && item) {
          // Get updated values
          const stock = field === "stock" ? Number(value) || 0 : item.stock;
          const orders =
            field === "quantity" ? Number(value) || 0 : item.quantity;
          const forecastValue = forecast.forecast;

          // Apply the Excel formula:
          // If orders > forecast: production = orders + (forecast × 0.8) - stock
          // Else: production = (forecast × 0.8) - stock + orders
          let suggestedProduction: number;
          const forecastVitrine = forecastValue * 0.8;

          if (orders > forecastValue) {
            suggestedProduction = orders + forecastVitrine - stock;
          } else {
            suggestedProduction = forecastVitrine - stock + orders;
          }

          newForecasts.set(productId, {
            ...forecast,
            suggestedProduction: Math.max(0, Math.round(suggestedProduction)),
          });
        }
        return newForecasts;
      });
    }
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Cabeçalho com Resumo Flutuante */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Criar Novo Pedido
          </h2>
          <p className="text-muted-foreground mt-1">
            Adicione produtos de forma rápida e intuitiva
          </p>
        </div>

        {/* Resumo Compacto no Header */}
        {stats.totalItemsWithData > 0 && (
          <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="font-bold text-lg text-primary">
                  {stats.totalItemsWithData}
                </span>
                <span className="text-muted-foreground ml-1">
                  produtos no pedido
                </span>
              </div>
              {stats.totalEncomendas > 0 && (
                <>
                  <div className="h-4 w-px bg-border" />
                  <div>
                    <span className="font-semibold">
                      {stats.totalEncomendas}
                    </span>
                    <span className="text-muted-foreground ml-1">
                      encomendas
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Busca e Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Buscar produtos por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 text-base"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Toggle View Mode */}
            <div className="flex gap-2 items-center">
              <div className="flex gap-1 p-1 bg-muted rounded-lg">
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className="h-9 px-3"
                >
                  <TableIcon className="h-4 w-4 mr-2" />
                  Tabela
                </Button>
                <Button
                  variant={viewMode === "cards" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("cards")}
                  className="h-9 px-3"
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Cards
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela/Cards de Produtos */}
      {viewMode === "table" ? (
        /* TABELA VIEW - Otimizado para entrada rápida */
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-b-2">
                  <TableHead className="w-[20%] font-semibold">
                    Produto
                  </TableHead>
                  <TableHead className="w-[10%] text-center font-semibold">
                    Estoque Atual
                  </TableHead>
                  <TableHead className="w-[10%] text-center font-semibold bg-muted/30">
                    Previsão
                  </TableHead>
                  <TableHead className="w-[10%] text-center font-semibold">
                    Encomendas
                  </TableHead>
                  <TableHead className="w-[15%] text-center font-semibold bg-primary/5">
                    Sugestão de Produção
                  </TableHead>
                  <TableHead className="w-[15%] text-center font-semibold bg-green-50 dark:bg-green-950/20">
                    Pedidos para Produção
                  </TableHead>
                  <TableHead className="w-[20%] text-center font-semibold">
                    Detalhes da Encomenda
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => {
                  const item = orderItems.get(product.id);
                  const forecast = forecasts.get(product.id);
                  const hasQuantity = (item?.quantity || 0) > 0;

                  return (
                    <TableRow
                      key={product.id}
                      className={hasQuantity ? "bg-primary/5" : ""}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <span className="font-medium">{product.name}</span>
                            {product.isClassA && (
                              <Badge
                                variant="secondary"
                                className="w-fit mt-1 text-xs gap-1"
                              >
                                <TrendingUp className="h-2.5 w-2.5" />
                                Classe A
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Estoque Atual - Editável (Azul) */}
                      <TableCell className="bg-blue-50 dark:bg-blue-950/20">
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={item?.stock || ""}
                          onChange={(e) => {
                            updateOrderItem(
                              product.id,
                              "stock",
                              parseInt(e.target.value) || 0
                            );
                          }}
                          className="h-9 text-center font-medium bg-white dark:bg-gray-900"
                          autoComplete="off"
                          onFocus={(e) => e.target.select()}
                        />
                      </TableCell>

                      {/* Previsão - Não editável (Laranja) */}
                      <TableCell className="bg-orange-50 dark:bg-orange-950/20 text-center">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-orange-100 dark:bg-orange-900/30">
                          <span className="font-semibold text-base">
                            {forecast?.forecast || 0}
                          </span>
                        </div>
                      </TableCell>

                      {/* Encomendas - Editável (Azul) */}
                      <TableCell className="bg-blue-50 dark:bg-blue-950/20">
                        {product.allowOrders ? (
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={item?.quantity || ""}
                            onChange={(e) => {
                              updateOrderItem(
                                product.id,
                                "quantity",
                                parseInt(e.target.value) || 0
                              );
                            }}
                            className="h-9 text-center font-medium bg-white dark:bg-gray-900"
                            autoComplete="off"
                            onFocus={(e) => e.target.select()}
                          />
                        ) : (
                          <div className="text-center text-xs text-muted-foreground italic">
                            Não disponível
                          </div>
                        )}
                      </TableCell>

                      {/* Sugestão de Produção - Calculada (Amarelo) */}
                      <TableCell className="bg-yellow-50 dark:bg-yellow-950/20 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800">
                          <Package className="h-4 w-4 text-yellow-700 dark:text-yellow-300" />
                          <span className="font-bold text-lg text-yellow-700 dark:text-yellow-300">
                            {forecast?.suggestedProduction || 0}
                          </span>
                        </div>
                      </TableCell>

                      {/* Pedidos para Produção - Editável (Verde) */}
                      <TableCell className="bg-green-50 dark:bg-green-950/20">
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={item?.productionQuantity || ""}
                          onChange={(e) => {
                            updateOrderItem(
                              product.id,
                              "productionQuantity",
                              parseInt(e.target.value) || 0
                            );
                          }}
                          className="h-9 text-center font-medium bg-white dark:bg-gray-900"
                          autoComplete="off"
                          onFocus={(e) => e.target.select()}
                        />
                      </TableCell>

                      {/* Detalhes da Encomenda */}
                      <TableCell className="p-2">
                        {!product.allowOrders ? (
                          <div className="text-center text-xs text-muted-foreground italic">
                            —
                          </div>
                        ) : hasQuantity ? (
                          <div className="space-y-1.5 min-w-[200px]">
                            {/* Cliente */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground shrink-0">
                                👤
                              </span>
                              <Input
                                type="text"
                                placeholder="Nome do cliente *"
                                value={item?.clientName || ""}
                                onChange={(e) => {
                                  updateOrderItem(
                                    product.id,
                                    "clientName",
                                    e.target.value
                                  );
                                }}
                                className="h-7 text-xs flex-1"
                                autoComplete="off"
                              />
                            </div>

                            {/* Data de Entrega */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground shrink-0">
                                📅
                              </span>
                              <Input
                                type="date"
                                value={item?.deliveryDate || ""}
                                onChange={(e) => {
                                  updateOrderItem(
                                    product.id,
                                    "deliveryDate",
                                    e.target.value
                                  );
                                }}
                                className="h-7 text-xs flex-1"
                                min={new Date().toISOString().split("T")[0]}
                              />
                            </div>

                            {/* Observação */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground shrink-0">
                                💬
                              </span>
                              <Input
                                type="text"
                                placeholder="Obs (opcional)"
                                value={item?.observation || ""}
                                onChange={(e) => {
                                  updateOrderItem(
                                    product.id,
                                    "observation",
                                    e.target.value
                                  );
                                }}
                                className="h-7 text-xs flex-1"
                                autoComplete="off"
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            —
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : filteredProducts.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Nenhum produto encontrado
            </h3>
            <p className="text-muted-foreground">
              {searchTerm
                ? "Tente buscar com outros termos"
                : "Nenhum produto disponível"}
            </p>
          </div>
        </Card>
      ) : (
        /* CARDS VIEW - Mantido para visualização detalhada */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => {
            const item = orderItems.get(product.id);
            const forecast = forecasts.get(product.id);
            const hasQuantity = (item?.quantity || 0) > 0;

            return (
              <Card
                key={product.id}
                className={`transition-all hover:shadow-lg ${
                  hasQuantity
                    ? "border-primary/50 shadow-md ring-2 ring-primary/10"
                    : "hover:border-primary/30"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-base leading-tight">
                        {product.name}
                      </CardTitle>
                      {product.isClassA && (
                        <Badge variant="secondary" className="mt-1.5 gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Classe A
                        </Badge>
                      )}
                    </div>
                    {hasQuantity && item && (
                      <Badge className="gap-1 bg-primary text-primary-foreground shrink-0">
                        <Check className="h-3 w-3" />
                        {item.quantity}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {/* Suggestion Badge */}
                  {forecast && forecast.suggestedProduction > 0 && (
                    <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <Package className="h-5 w-5 text-primary" />
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground font-medium">
                          Sugestão de Produção
                        </div>
                        <div className="text-2xl font-bold text-primary">
                          {forecast.suggestedProduction}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground font-medium">
                        Estoque Atual
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={item?.stock || ""}
                        onChange={(e) => {
                          updateOrderItem(
                            product.id,
                            "stock",
                            parseInt(e.target.value) || 0
                          );
                        }}
                        className="h-10 text-center font-medium bg-blue-50 dark:bg-blue-950/20"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground font-medium">
                        Previsão
                      </Label>
                      <div className="h-10 flex items-center justify-center rounded-md bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800">
                        <span className="font-semibold">
                          {forecast?.forecast || 0}
                        </span>
                      </div>
                    </div>

                    <div className="col-span-2 space-y-1.5">
                      <Label className="text-xs text-muted-foreground font-medium">
                        Encomendas
                      </Label>
                      {product.allowOrders ? (
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={item?.quantity || ""}
                          onChange={(e) => {
                            updateOrderItem(
                              product.id,
                              "quantity",
                              parseInt(e.target.value) || 0
                            );
                          }}
                          className="h-10 text-center font-medium bg-blue-50 dark:bg-blue-950/20"
                        />
                      ) : (
                        <div className="h-10 flex items-center justify-center rounded-md bg-muted/50 border text-xs text-muted-foreground italic">
                          Não disponível para encomenda
                        </div>
                      )}
                    </div>

                    <div className="col-span-2 space-y-1.5">
                      <Label className="text-xs text-muted-foreground font-medium">
                        Pedidos para Produção
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={item?.productionQuantity || ""}
                        onChange={(e) => {
                          updateOrderItem(
                            product.id,
                            "productionQuantity",
                            parseInt(e.target.value) || 0
                          );
                        }}
                        className="h-10 text-center font-medium bg-green-50 dark:bg-green-950/20"
                        autoComplete="off"
                        onFocus={(e) => e.target.select()}
                      />
                    </div>

                    {/* Detalhes da Encomenda - Cards */}
                    {product.allowOrders && hasQuantity && (
                      <>
                        <div className="col-span-2 pt-2 border-t">
                          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-2">
                            💡 Este item é uma Encomenda. Preencha os dados
                            obrigatórios:
                          </p>
                        </div>

                        <div className="col-span-2 space-y-1.5">
                          <Label className="text-xs text-muted-foreground font-medium">
                            Nome do Cliente *
                          </Label>
                          <Input
                            type="text"
                            placeholder="Nome do cliente"
                            value={item?.clientName || ""}
                            onChange={(e) => {
                              updateOrderItem(
                                product.id,
                                "clientName",
                                e.target.value
                              );
                            }}
                            className="h-9"
                            autoComplete="off"
                          />
                        </div>

                        <div className="col-span-2 space-y-1.5">
                          <Label className="text-xs text-muted-foreground font-medium">
                            Data de Entrega *
                          </Label>
                          <Input
                            type="date"
                            value={item?.deliveryDate || ""}
                            onChange={(e) => {
                              updateOrderItem(
                                product.id,
                                "deliveryDate",
                                e.target.value
                              );
                            }}
                            className="h-9"
                            min={new Date().toISOString().split("T")[0]}
                          />
                        </div>

                        <div className="col-span-2 space-y-1.5">
                          <Label className="text-xs text-muted-foreground font-medium">
                            Observação (opcional)
                          </Label>
                          <Input
                            type="text"
                            placeholder="Ex: sem açúcar, decoração especial..."
                            value={item?.observation || ""}
                            onChange={(e) => {
                              updateOrderItem(
                                product.id,
                                "observation",
                                e.target.value
                              );
                            }}
                            className="h-9"
                            autoComplete="off"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Botão Fixo de Revisar - Melhorado */}
      {stats.totalItemsWithData > 0 && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4">
          <Button
            onClick={handleOpenSummary}
            size="lg"
            className="shadow-2xl gap-3 h-16 px-8 text-lg font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary hover:shadow-xl transition-all hover:scale-105"
          >
            <div className="relative">
              <ShoppingCart className="h-6 w-6" />
              <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-[10px] border-2 border-white">
                {stats.totalItemsWithData}
              </Badge>
            </div>
            <div className="flex flex-col items-start">
              <span>Revisar Pedido</span>
              <span className="text-xs font-normal opacity-90">
                {stats.totalEncomendas > 0 && stats.totalProduction > 0
                  ? `${stats.totalEncomendas} encomendas • ${stats.totalProduction} produção`
                  : stats.totalEncomendas > 0
                    ? `${stats.totalEncomendas} encomendas`
                    : stats.totalProduction > 0
                      ? `${stats.totalProduction} para produção`
                      : "Apenas vitrine"}
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
