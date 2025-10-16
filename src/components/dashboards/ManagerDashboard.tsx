"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
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
import { DailyInsightCard } from "./DailyInsightCard";
import {
  Search,
  ShoppingCart,
  Package,
  CalendarDays,
  User,
  Sparkles,
  Plus,
  Minus,
  Check,
  X,
  Clock,
  TrendingUp,
  Table as TableIcon,
  LayoutGrid,
} from "lucide-react";

interface Product {
  id: number;
  name: string;
  isClassA: boolean;
}

interface OrderItemData {
  productId: number;
  productName: string;
  stock: number;
  quantity: number;
  type: "Vitrine" | "Encomenda";
  clientName?: string;
  deliveryDate?: string;
}

interface EncomendaInfo {
  clientName: string;
  deliveryDate: string;
}

export function ManagerDashboard() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [orderItems, setOrderItems] = useState<Map<number, OrderItemData>>(
    new Map()
  );
  const [showEncomendaDialog, setShowEncomendaDialog] = useState(false);
  const [currentProductId, setCurrentProductId] = useState<number | null>(null);
  const [encomendaInfo, setEncomendaInfo] = useState<EncomendaInfo>({
    clientName: "",
    deliveryDate: "",
  });
  const [showSummary, setShowSummary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState<Map<number, number>>(
    new Map()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"vitrine" | "encomenda">(
    "vitrine"
  );
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  useEffect(() => {
    fetchProducts();
  }, []);

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
        newItems.set(productId, { ...item, [field]: value });
      }
      return newItems;
    });
  };

  const incrementQuantity = (productId: number) => {
    const item = orderItems.get(productId);
    if (item) {
      updateOrderItem(productId, "quantity", (item.quantity || 0) + 1);
    }
  };

  const decrementQuantity = (productId: number) => {
    const item = orderItems.get(productId);
    if (item && item.quantity > 0) {
      updateOrderItem(productId, "quantity", item.quantity - 1);
    }
  };

  const openEncomendaDialog = (productId: number) => {
    setCurrentProductId(productId);
    const item = orderItems.get(productId);

    // Sempre mudar para Encomenda ao abrir o diálogo
    updateOrderItem(productId, "type", "Encomenda");

    if (item?.clientName) {
      setEncomendaInfo({
        clientName: item.clientName || "",
        deliveryDate: item.deliveryDate || "",
      });
    } else {
      setEncomendaInfo({ clientName: "", deliveryDate: "" });
    }
    setShowEncomendaDialog(true);
  };

  const saveEncomendaInfo = () => {
    if (currentProductId !== null) {
      updateOrderItem(currentProductId, "clientName", encomendaInfo.clientName);
      updateOrderItem(
        currentProductId,
        "deliveryDate",
        encomendaInfo.deliveryDate
      );
      toast.success("Informações da encomenda salvas!");
    }
    setShowEncomendaDialog(false);
  };

  const applySuggestion = (productId: number) => {
    const suggestion = suggestions.get(productId);
    if (suggestion) {
      updateOrderItem(productId, "quantity", suggestion);
      toast.success("Sugestão aplicada!");
    }
  };

  const handleOpenSummary = () => {
    const itemsWithQuantity = Array.from(orderItems.values()).filter(
      (item) => item.quantity > 0
    );

    if (itemsWithQuantity.length === 0) {
      toast.error("Adicione pelo menos um item ao pedido");
      return;
    }

    // Validar encomendas
    const invalidEncomendas = itemsWithQuantity.filter(
      (item) =>
        item.type === "Encomenda" && (!item.clientName || !item.deliveryDate)
    );

    if (invalidEncomendas.length > 0) {
      toast.error(
        "Preencha os dados do cliente para todos os itens de encomenda"
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
        .filter((item) => item.quantity > 0)
        .map((item) => ({
          productId: item.productId,
          stock: item.stock,
          quantity: item.quantity,
          type: item.type,
          clientName: item.type === "Encomenda" ? item.clientName : undefined,
          deliveryDate:
            item.type === "Encomenda" ? item.deliveryDate : undefined,
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
        setSuggestions(new Map());
        setShowSummary(false);
        setSearchTerm("");
      } else {
        const error = await response.json();
        toast.error(error.message || "Erro ao criar pedido");
      }
    } catch {
      toast.error("Erro ao enviar pedido");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtrar produtos por tipo e termo de busca
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const item = orderItems.get(product.id);
      const matchesSearch = product.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesTab =
        activeTab === "vitrine"
          ? item?.type === "Vitrine"
          : item?.type === "Encomenda";

      return matchesSearch && (matchesTab || (item?.quantity || 0) === 0);
    });
  }, [products, orderItems, searchTerm, activeTab]);

  // Estatísticas do pedido
  const stats = useMemo(() => {
    const allItems = Array.from(orderItems.values());
    const itemsWithQty = allItems.filter((item) => item.quantity > 0);
    const vitrineItems = itemsWithQty.filter((item) => item.type === "Vitrine");
    const encomendaItems = itemsWithQty.filter(
      (item) => item.type === "Encomenda"
    );
    const totalQuantity = itemsWithQty.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    return {
      totalItems: itemsWithQty.length,
      totalQuantity,
      vitrineCount: vitrineItems.length,
      encomendaCount: encomendaItems.length,
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
        {stats.totalItems > 0 && (
          <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="font-bold text-lg text-primary">
                  {stats.totalItems}
                </span>
                <span className="text-muted-foreground ml-1">produtos</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div>
                <span className="font-semibold">{stats.totalQuantity}</span>
                <span className="text-muted-foreground ml-1">unidades</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Insight Estratégico de IA */}
      <DailyInsightCard />

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

          {/* Quick Stats */}
          <div className="flex gap-2 mt-4">
            <Badge
              variant={activeTab === "vitrine" ? "default" : "outline"}
              className="px-3 py-2 gap-1.5 cursor-pointer transition-all"
              onClick={() => setActiveTab("vitrine")}
            >
              <Package className="h-3.5 w-3.5" />
              Vitrine {stats.vitrineCount > 0 && `(${stats.vitrineCount})`}
            </Badge>
            <Badge
              variant={activeTab === "encomenda" ? "default" : "outline"}
              className={`px-3 py-2 gap-1.5 cursor-pointer transition-all ${
                activeTab === "encomenda"
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                  : ""
              }`}
              onClick={() => setActiveTab("encomenda")}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Encomenda{" "}
              {stats.encomendaCount > 0 && `(${stats.encomendaCount})`}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Vitrine e Encomenda */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "vitrine" | "encomenda")}
        className="space-y-6"
      >
        <TabsContent value="vitrine" className="space-y-4 mt-0">
          {viewMode === "table" ? (
            /* TABELA VIEW - Otimizado para entrada rápida */
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Produto</TableHead>
                      <TableHead className="w-[15%] text-center">
                        Estoque Atual
                      </TableHead>
                      <TableHead className="w-[20%] text-center">
                        Quantidade
                      </TableHead>
                      <TableHead className="w-[15%] text-center">
                        Sugestão IA
                      </TableHead>
                      <TableHead className="w-[10%]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts
                      .filter((p) => {
                        const item = orderItems.get(p.id);
                        return (
                          !item ||
                          item.type === "Vitrine" ||
                          item.quantity === 0
                        );
                      })
                      .map((product) => {
                        const item = orderItems.get(product.id);
                        const suggestion = suggestions.get(product.id);
                        const hasQuantity = (item?.quantity || 0) > 0;

                        return (
                          <TableRow
                            key={product.id}
                            className={hasQuantity ? "bg-primary/5" : ""}
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {product.name}
                                  </span>
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

                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={item?.stock || ""}
                                onChange={(e) => {
                                  updateOrderItem(
                                    product.id,
                                    "type",
                                    "Vitrine"
                                  );
                                  updateOrderItem(
                                    product.id,
                                    "stock",
                                    parseInt(e.target.value) || 0
                                  );
                                }}
                                className="h-9 text-center"
                                autoComplete="off"
                                onFocus={(e) => e.target.select()}
                              />
                            </TableCell>

                            <TableCell>
                              <div className="flex items-center gap-1 justify-center">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 shrink-0"
                                  onClick={() => {
                                    updateOrderItem(
                                      product.id,
                                      "type",
                                      "Vitrine"
                                    );
                                    decrementQuantity(product.id);
                                  }}
                                  disabled={(item?.quantity || 0) === 0}
                                  tabIndex={-1}
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </Button>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={item?.quantity || ""}
                                  onChange={(e) => {
                                    updateOrderItem(
                                      product.id,
                                      "type",
                                      "Vitrine"
                                    );
                                    updateOrderItem(
                                      product.id,
                                      "quantity",
                                      parseInt(e.target.value) || 0
                                    );
                                  }}
                                  className="h-9 text-center font-bold max-w-[80px]"
                                  autoComplete="off"
                                  onFocus={(e) => e.target.select()}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 shrink-0"
                                  onClick={() => {
                                    updateOrderItem(
                                      product.id,
                                      "type",
                                      "Vitrine"
                                    );
                                    incrementQuantity(product.id);
                                  }}
                                  tabIndex={-1}
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>

                            <TableCell className="text-center">
                              {suggestion ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    updateOrderItem(
                                      product.id,
                                      "type",
                                      "Vitrine"
                                    );
                                    applySuggestion(product.id);
                                  }}
                                  className="gap-1.5 border-amber-500/50 text-amber-700 hover:bg-amber-50"
                                  tabIndex={-1}
                                >
                                  <Sparkles className="h-3 w-3 fill-amber-500" />
                                  {suggestion}
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-sm">
                                  —
                                </span>
                              )}
                            </TableCell>

                            <TableCell>
                              {hasQuantity && item && (
                                <Badge className="gap-1 bg-primary text-primary-foreground">
                                  <Check className="h-3 w-3" />
                                  OK
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : filteredProducts.filter((p) => {
              const item = orderItems.get(p.id);
              return !item || item.type === "Vitrine" || item.quantity === 0;
            }).length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Nenhum produto encontrado
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm
                    ? "Tente buscar com outros termos"
                    : "Adicione produtos à vitrine"}
                </p>
              </div>
            </Card>
          ) : (
            /* CARDS VIEW - Mantido para visualização detalhada */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts
                .filter((p) => {
                  const item = orderItems.get(p.id);
                  return (
                    !item || item.type === "Vitrine" || item.quantity === 0
                  );
                })
                .map((product) => {
                  const item = orderItems.get(product.id);
                  const suggestion = suggestions.get(product.id);
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
                              <Badge
                                variant="secondary"
                                className="mt-1.5 gap-1"
                              >
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
                        {suggestion && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              updateOrderItem(product.id, "type", "Vitrine");
                              applySuggestion(product.id);
                            }}
                            className="w-full mt-2 gap-2 border-amber-500/50 text-amber-700 hover:bg-amber-50 hover:border-amber-500"
                          >
                            <Sparkles className="h-3.5 w-3.5 fill-amber-500" />
                            Sugestão IA: {suggestion}
                          </Button>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-3 pt-0">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">
                              Estoque
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={item?.stock || ""}
                              onChange={(e) => {
                                updateOrderItem(product.id, "type", "Vitrine");
                                updateOrderItem(
                                  product.id,
                                  "stock",
                                  parseInt(e.target.value) || 0
                                );
                              }}
                              className="h-9 text-center"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">
                              Pedir
                            </Label>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 shrink-0"
                                onClick={() => {
                                  updateOrderItem(
                                    product.id,
                                    "type",
                                    "Vitrine"
                                  );
                                  decrementQuantity(product.id);
                                }}
                                disabled={(item?.quantity || 0) === 0}
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </Button>
                              <Input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={item?.quantity || ""}
                                onChange={(e) => {
                                  updateOrderItem(
                                    product.id,
                                    "type",
                                    "Vitrine"
                                  );
                                  updateOrderItem(
                                    product.id,
                                    "quantity",
                                    parseInt(e.target.value) || 0
                                  );
                                }}
                                className="h-9 text-center font-bold"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 shrink-0"
                                onClick={() => {
                                  updateOrderItem(
                                    product.id,
                                    "type",
                                    "Vitrine"
                                  );
                                  incrementQuantity(product.id);
                                }}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="encomenda" className="space-y-4 mt-0">
          {viewMode === "table" ? (
            /* TABELA VIEW - Encomendas */
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30%]">Produto</TableHead>
                      <TableHead className="w-[15%] text-center">
                        Quantidade
                      </TableHead>
                      <TableHead className="w-[25%]">Cliente</TableHead>
                      <TableHead className="w-[20%]">Data Entrega</TableHead>
                      <TableHead className="w-[10%]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => {
                      const item = orderItems.get(product.id);
                      const hasQuantity = (item?.quantity || 0) > 0;
                      const isEncomenda = item?.type === "Encomenda";
                      const hasEncomendaInfo = !!(
                        item?.clientName && item?.deliveryDate
                      );

                      if (!isEncomenda && hasQuantity) return null;

                      return (
                        <TableRow
                          key={product.id}
                          className={hasQuantity ? "bg-secondary/20" : ""}
                        >
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {product.name}
                              </span>
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
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-1 justify-center">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 shrink-0"
                                onClick={() => {
                                  updateOrderItem(
                                    product.id,
                                    "type",
                                    "Encomenda"
                                  );
                                  decrementQuantity(product.id);
                                }}
                                disabled={(item?.quantity || 0) === 0}
                                tabIndex={-1}
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </Button>
                              <Input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={item?.quantity || ""}
                                onChange={(e) => {
                                  updateOrderItem(
                                    product.id,
                                    "type",
                                    "Encomenda"
                                  );
                                  updateOrderItem(
                                    product.id,
                                    "quantity",
                                    parseInt(e.target.value) || 0
                                  );
                                }}
                                className="h-9 text-center font-bold max-w-[80px]"
                                autoComplete="off"
                                onFocus={(e) => e.target.select()}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 shrink-0"
                                onClick={() => {
                                  updateOrderItem(
                                    product.id,
                                    "type",
                                    "Encomenda"
                                  );
                                  incrementQuantity(product.id);
                                }}
                                tabIndex={-1}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>

                          <TableCell>
                            {hasQuantity ? (
                              <Input
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
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                —
                              </span>
                            )}
                          </TableCell>

                          <TableCell>
                            {hasQuantity ? (
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
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                —
                              </span>
                            )}
                          </TableCell>

                          <TableCell>
                            {hasQuantity && item && hasEncomendaInfo && (
                              <Badge className="gap-1 bg-primary text-primary-foreground">
                                <Check className="h-3 w-3" />
                                OK
                              </Badge>
                            )}
                            {hasQuantity && !hasEncomendaInfo && (
                              <Badge variant="destructive" className="gap-1">
                                <X className="h-3 w-3" />
                                Falta
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : products.filter((p) => {
              const item = orderItems.get(p.id);
              const isEncomenda = item?.type === "Encomenda";
              const hasQuantity = (item?.quantity || 0) > 0;
              return !isEncomenda && hasQuantity ? false : true;
            }).length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Nenhuma encomenda
                </h3>
                <p className="text-muted-foreground">
                  Adicione produtos e preencha os dados do cliente
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => {
                const item = orderItems.get(product.id);
                const hasQuantity = (item?.quantity || 0) > 0;
                const isEncomenda = item?.type === "Encomenda";
                const hasEncomendaInfo = !!(
                  item?.clientName && item?.deliveryDate
                );

                // Só mostrar se for encomenda OU se tiver sido adicionado como encomenda
                if (!isEncomenda && hasQuantity) return null;

                return (
                  <Card
                    key={product.id}
                    className={`transition-all hover:shadow-lg ${
                      hasQuantity
                        ? "border-secondary/50 shadow-md ring-2 ring-secondary/10"
                        : "hover:border-secondary/30"
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
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          Quantidade
                        </Label>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            onClick={() => {
                              updateOrderItem(product.id, "type", "Encomenda");
                              decrementQuantity(product.id);
                            }}
                            disabled={(item?.quantity || 0) === 0}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={item?.quantity || ""}
                            onChange={(e) => {
                              updateOrderItem(product.id, "type", "Encomenda");
                              updateOrderItem(
                                product.id,
                                "quantity",
                                parseInt(e.target.value) || 0
                              );
                            }}
                            className="h-9 text-center font-bold"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            onClick={() => {
                              updateOrderItem(product.id, "type", "Encomenda");
                              incrementQuantity(product.id);
                            }}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {hasQuantity && (
                        <div className="space-y-2 pt-2 border-t">
                          {hasEncomendaInfo ? (
                            <div className="space-y-2 p-3 bg-secondary/20 dark:bg-secondary/10 rounded-md">
                              <div className="flex items-center gap-2 text-sm">
                                <User className="h-3.5 w-3.5 text-secondary-foreground" />
                                <span className="font-medium">
                                  {item.clientName}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-3.5 w-3.5 text-secondary-foreground" />
                                <span>
                                  {new Date(
                                    item.deliveryDate + "T00:00:00"
                                  ).toLocaleDateString("pt-BR")}
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => openEncomendaDialog(product.id)}
                                className="w-full mt-1 h-8 text-xs"
                              >
                                Editar
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="default"
                              size="sm"
                              onClick={() => openEncomendaDialog(product.id)}
                              className="w-full gap-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                            >
                              <User className="h-3.5 w-3.5" />
                              Adicionar Cliente
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Botão Fixo de Revisar - Melhorado */}
      {stats.totalItems > 0 && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4">
          <Button
            onClick={handleOpenSummary}
            size="lg"
            className="shadow-2xl gap-3 h-16 px-8 text-lg font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary hover:shadow-xl transition-all hover:scale-105"
          >
            <div className="relative">
              <ShoppingCart className="h-6 w-6" />
              <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-[10px] border-2 border-white">
                {stats.totalItems}
              </Badge>
            </div>
            <div className="flex flex-col items-start">
              <span>Revisar Pedido</span>
              <span className="text-xs font-normal opacity-90">
                {stats.totalQuantity} unidades
              </span>
            </div>
          </Button>
        </div>
      )}

      {/* Dialog de Encomenda - Melhorado */}
      <Dialog open={showEncomendaDialog} onOpenChange={setShowEncomendaDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 bg-secondary/30 dark:bg-secondary/20 rounded-lg">
                <User className="h-5 w-5 text-secondary-foreground" />
              </div>
              Informações da Encomenda
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Preencha os dados do cliente e a data de entrega
            </p>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="client-name" className="text-sm font-medium">
                Nome do Cliente *
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="client-name"
                  value={encomendaInfo.clientName}
                  onChange={(e) =>
                    setEncomendaInfo({
                      ...encomendaInfo,
                      clientName: e.target.value,
                    })
                  }
                  placeholder="Ex: Maria Silva"
                  className="h-11 pl-10"
                  autoFocus
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery-date" className="text-sm font-medium">
                Data de Entrega *
              </Label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                <Input
                  id="delivery-date"
                  type="date"
                  value={encomendaInfo.deliveryDate}
                  onChange={(e) =>
                    setEncomendaInfo({
                      ...encomendaInfo,
                      deliveryDate: e.target.value,
                    })
                  }
                  className="h-11 pl-10"
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <p className="text-xs text-muted-foreground">Data mínima: hoje</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowEncomendaDialog(false)}
              className="flex-1 sm:flex-none"
            >
              Cancelar
            </Button>
            <Button
              onClick={saveEncomendaInfo}
              disabled={
                !encomendaInfo.clientName || !encomendaInfo.deliveryDate
              }
              className="flex-1 sm:flex-none"
            >
              <Check className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Resumo */}
      <OrderSummaryDialog
        open={showSummary}
        onOpenChange={setShowSummary}
        items={Array.from(orderItems.values()).filter(
          (item) => item.quantity > 0
        )}
        onConfirm={handleSubmitOrder}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
