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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    <div className="space-y-6 pb-8">
      {/* Cabeçalho */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Criar Novo Pedido</h2>
        <p className="text-muted-foreground mt-2">
          Adicione produtos ao seu pedido de forma rápida e intuitiva
        </p>
      </div>

      {/* Estatísticas e Ações Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Itens no Pedido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats.totalItems}</span>
              <span className="text-sm text-muted-foreground">
                ({stats.totalQuantity} unid.)
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vitrine
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{stats.vitrineCount}</span>
              <span className="text-sm text-muted-foreground">itens</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Encomendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{stats.encomendaCount}</span>
              <span className="text-sm text-muted-foreground">itens</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sugestões
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold">{suggestions.size}</span>
              <span className="text-sm text-muted-foreground">disponíveis</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insight Estratégico de IA */}
      <DailyInsightCard />

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Buscar produtos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-12 text-base"
        />
      </div>

      {/* Tabs: Vitrine e Encomenda */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "vitrine" | "encomenda")}
      >
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="vitrine" className="gap-2">
            <Package className="h-4 w-4" />
            Vitrine
            {stats.vitrineCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {stats.vitrineCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="encomenda" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            Encomenda
            {stats.encomendaCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {stats.encomendaCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vitrine" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts
              .filter((p) => {
                const item = orderItems.get(p.id);
                return !item || item.type === "Vitrine" || item.quantity === 0;
              })
              .map((product) => {
                const item = orderItems.get(product.id);
                const suggestion = suggestions.get(product.id);
                const hasQuantity = (item?.quantity || 0) > 0;

                return (
                  <Card
                    key={product.id}
                    className={`transition-all ${
                      hasQuantity
                        ? "border-primary shadow-md"
                        : "hover:border-primary/50"
                    }`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">
                          {product.name}
                        </CardTitle>
                        {hasQuantity && (
                          <Badge variant="default" className="gap-1">
                            <Check className="h-3 w-3" />
                            Adicionado
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
                          className="w-full mt-2 gap-2 border-amber-500/50 text-amber-600 hover:bg-amber-50"
                        >
                          <Sparkles className="h-4 w-4" />
                          Sugestão: {suggestion} unid.
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Estoque Atual</Label>
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
                          className="h-11"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Quantidade a Pedir</Label>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              updateOrderItem(product.id, "type", "Vitrine");
                              decrementQuantity(product.id);
                            }}
                            disabled={(item?.quantity || 0) === 0}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={item?.quantity || ""}
                            onChange={(e) => {
                              updateOrderItem(product.id, "type", "Vitrine");
                              updateOrderItem(
                                product.id,
                                "quantity",
                                parseInt(e.target.value) || 0
                              );
                            }}
                            className="h-11 text-center text-lg font-semibold"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              updateOrderItem(product.id, "type", "Vitrine");
                              incrementQuantity(product.id);
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </TabsContent>

        <TabsContent value="encomenda" className="space-y-4 mt-6">
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
                  className={`transition-all ${
                    hasQuantity
                      ? "border-green-500 shadow-md"
                      : "hover:border-green-500/50"
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      {hasQuantity && (
                        <Badge variant="default" className="gap-1 bg-green-600">
                          <Check className="h-3 w-3" />
                          Encomenda
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Quantidade</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            updateOrderItem(product.id, "type", "Encomenda");
                            decrementQuantity(product.id);
                          }}
                          disabled={(item?.quantity || 0) === 0}
                        >
                          <Minus className="h-4 w-4" />
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
                          className="h-11 text-center text-lg font-semibold"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            updateOrderItem(product.id, "type", "Encomenda");
                            incrementQuantity(product.id);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {hasQuantity && (
                      <div className="space-y-3 pt-2 border-t">
                        {hasEncomendaInfo ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {item.clientName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <CalendarDays className="h-4 w-4 text-muted-foreground" />
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
                              className="w-full"
                            >
                              Editar Informações
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            onClick={() => openEncomendaDialog(product.id)}
                            className="w-full gap-2"
                          >
                            <User className="h-4 w-4" />
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
        </TabsContent>
      </Tabs>

      {/* Botão Fixo de Revisar */}
      {stats.totalItems > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={handleOpenSummary}
            size="lg"
            className="shadow-lg gap-2 h-14 px-8 text-lg"
          >
            <ShoppingCart className="h-5 w-5" />
            Revisar Pedido ({stats.totalItems})
          </Button>
        </div>
      )}

      {/* Dialog de Encomenda */}
      <Dialog open={showEncomendaDialog} onOpenChange={setShowEncomendaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações da Encomenda
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="client-name">Nome do Cliente *</Label>
              <Input
                id="client-name"
                value={encomendaInfo.clientName}
                onChange={(e) =>
                  setEncomendaInfo({
                    ...encomendaInfo,
                    clientName: e.target.value,
                  })
                }
                placeholder="Digite o nome do cliente"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery-date">Data de Entrega *</Label>
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
                className="h-11"
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEncomendaDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={saveEncomendaInfo}
              disabled={
                !encomendaInfo.clientName || !encomendaInfo.deliveryDate
              }
            >
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
