"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Edit3 } from "lucide-react";

interface OrderItem {
  id: number;
  product: {
    name: string;
  };
  stock: number;
  quantity: number;
  type: "Vitrine" | "Encomenda";
  clientName?: string;
  deliveryDate?: string;
  observation?: string;
}

interface Order {
  id: string;
  code: string;
  items: OrderItem[];
}

interface EditItemData {
  id: number;
  originalStock: number;
  originalQuantity: number;
  originalType: "Vitrine" | "Encomenda";
  originalClientName?: string;
  originalDeliveryDate?: string;
  originalObservation?: string;
  newStock: number;
  newQuantity: number;
  newType: "Vitrine" | "Encomenda";
  newClientName?: string;
  newDeliveryDate?: string;
  newObservation?: string;
}

interface OrderItemsEditRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onSuccess: () => void;
}

export function OrderItemsEditRequestDialog({
  open,
  onOpenChange,
  order,
  onSuccess,
}: OrderItemsEditRequestDialogProps) {
  const [editData, setEditData] = useState<EditItemData[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [changesCount, setChangesCount] = useState(0);

  // Inicializar dados de edição quando o modal abrir
  useEffect(() => {
    if (open && order) {
      const initialData: EditItemData[] = order.items.map((item) => ({
        id: item.id,
        originalStock: item.stock,
        originalQuantity: item.quantity,
        originalType: item.type,
        originalClientName: item.clientName,
        originalDeliveryDate: item.deliveryDate,
        originalObservation: item.observation,
        newStock: item.stock,
        newQuantity: item.quantity,
        newType: item.type,
        newClientName: item.clientName,
        newDeliveryDate: item.deliveryDate,
        newObservation: item.observation,
      }));
      setEditData(initialData);
    }
  }, [open, order]);

  // Contar mudanças sempre que editData mudar
  useEffect(() => {
    const changes = editData.filter(
      (item) =>
        item.newStock !== item.originalStock ||
        item.newQuantity !== item.originalQuantity ||
        item.newType !== item.originalType ||
        item.newClientName !== item.originalClientName ||
        item.newDeliveryDate !== item.originalDeliveryDate ||
        item.newObservation !== item.originalObservation
    ).length;
    setChangesCount(changes);
  }, [editData]);

  const updateItem = <K extends keyof EditItemData>(
    itemId: number,
    field: K,
    value: EditItemData[K]
  ) => {
    setEditData((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    );
  };

  const resetItem = (itemId: number) => {
    setEditData((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            newStock: item.originalStock,
            newQuantity: item.originalQuantity,
            newType: item.originalType,
            newClientName: item.originalClientName,
            newDeliveryDate: item.originalDeliveryDate,
            newObservation: item.originalObservation,
          };
        }
        return item;
      })
    );
  };

  const hasChanges = (item: EditItemData) => {
    return (
      item.newStock !== item.originalStock ||
      item.newQuantity !== item.originalQuantity ||
      item.newType !== item.originalType ||
      item.newClientName !== item.originalClientName ||
      item.newDeliveryDate !== item.originalDeliveryDate ||
      item.newObservation !== item.originalObservation
    );
  };

  const isItemDeleted = (item: EditItemData) => {
    return item.newQuantity === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (changesCount === 0) {
      toast.error("Nenhuma alteração foi feita nos itens");
      return;
    }

    // Validar itens do tipo "Encomenda"
    const invalidEncomendas = editData.filter(
      (item) =>
        item.newType === "Encomenda" &&
        item.newQuantity > 0 && // Só valida se não está sendo excluído
        (!item.newClientName ||
          item.newClientName.trim() === "" ||
          !item.newDeliveryDate ||
          item.newDeliveryDate.trim() === "")
    );

    if (invalidEncomendas.length > 0) {
      const productNames = invalidEncomendas
        .map((item) => {
          const orderItem = order?.items.find((i) => i.id === item.id);
          return orderItem?.product.name || "Desconhecido";
        })
        .join(", ");
      toast.error(
        `Os seguintes produtos do tipo "Encomenda" precisam ter nome do cliente e data de entrega: ${productNames}`
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Preparar apenas os itens que foram modificados
      const modifiedItems = editData.filter(hasChanges).map((item) => ({
        orderItemId: item.id,
        newStock: item.newStock,
        newQuantity: item.newQuantity,
        newType: item.newType,
        newClientName: item.newClientName || null,
        newDeliveryDate: item.newDeliveryDate || null,
        newObservation: item.newObservation || null,
      }));

      const response = await fetch("/api/order-item-edit-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requests: modifiedItems }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        onSuccess();
        onOpenChange(false);
      } else {
        const error = await response.json();
        toast.error(error.message || "Erro ao enviar solicitação");
      }
    } catch (error: unknown) {
      console.error("Error submitting edit request:", error);
      toast.error("Erro ao enviar solicitação");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Edit3 className="h-6 w-6" />
            Editar Itens do Pedido
          </DialogTitle>
          <div className="bg-muted p-3 rounded-md">
            <p className="text-sm">
              <strong>Pedido:</strong> {order.code}
            </p>
            <p className="text-sm text-muted-foreground">
              {changesCount > 0 && (
                <Badge
                  variant={changesCount > 0 ? "default" : "secondary"}
                  className="mt-1"
                >
                  {changesCount} alteração(ões) pendente(s)
                </Badge>
              )}
            </p>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Instruções:</strong> Edite os campos conforme
                necessário. Para excluir um item, defina a quantidade como 0. As
                alterações serão enviadas para aprovação do supervisor.
              </p>
            </div>

            <div className="space-y-4">
              {editData.map((item) => {
                const itemHasChanges = hasChanges(item);
                const itemDeleted = isItemDeleted(item);

                return (
                  <div
                    key={item.id}
                    className={`border rounded-lg p-4 ${
                      itemHasChanges
                        ? "border-orange-300 bg-orange-50 dark:bg-orange-950"
                        : "border-gray-200"
                    } ${itemDeleted ? "border-red-300 bg-red-50 dark:bg-red-950" : ""}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-semibold text-lg">
                          {
                            order.items.find((i) => i.id === item.id)?.product
                              .name
                          }
                        </h4>
                        {itemDeleted && (
                          <Badge variant="destructive" className="mt-1">
                            <Trash2 className="h-3 w-3 mr-1" />
                            Será excluído
                          </Badge>
                        )}
                        {itemHasChanges && !itemDeleted && (
                          <Badge variant="default" className="mt-1">
                            <Edit3 className="h-3 w-3 mr-1" />
                            Modificado
                          </Badge>
                        )}
                      </div>
                      {itemHasChanges && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => resetItem(item.id)}
                        >
                          Desfazer
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      {/* Estoque */}
                      <div className="space-y-2">
                        <Label htmlFor={`stock-${item.id}`}>Estoque</Label>
                        <Input
                          id={`stock-${item.id}`}
                          type="number"
                          min="0"
                          value={item.newStock}
                          onChange={(e) =>
                            updateItem(
                              item.id,
                              "newStock",
                              parseInt(e.target.value) || 0
                            )
                          }
                          className={
                            item.newStock !== item.originalStock
                              ? "border-orange-400"
                              : ""
                          }
                        />
                        {item.newStock !== item.originalStock && (
                          <p className="text-xs text-orange-600">
                            Original: {item.originalStock}
                          </p>
                        )}
                      </div>

                      {/* Quantidade */}
                      <div className="space-y-2">
                        <Label htmlFor={`quantity-${item.id}`}>
                          Quantidade
                        </Label>
                        <Input
                          id={`quantity-${item.id}`}
                          type="number"
                          min="0"
                          value={item.newQuantity}
                          onChange={(e) =>
                            updateItem(
                              item.id,
                              "newQuantity",
                              parseInt(e.target.value) || 0
                            )
                          }
                          className={`${item.newQuantity !== item.originalQuantity ? "border-orange-400" : ""} ${itemDeleted ? "border-red-400 bg-red-50" : ""}`}
                        />
                        {item.newQuantity !== item.originalQuantity && (
                          <p className="text-xs text-orange-600">
                            Original: {item.originalQuantity}
                          </p>
                        )}
                      </div>

                      {/* Tipo */}
                      <div className="space-y-2">
                        <Label htmlFor={`type-${item.id}`}>Tipo</Label>
                        <Select
                          value={item.newType}
                          onValueChange={(value) =>
                            updateItem(
                              item.id,
                              "newType",
                              value as "Vitrine" | "Encomenda"
                            )
                          }
                        >
                          <SelectTrigger
                            className={
                              item.newType !== item.originalType
                                ? "border-orange-400"
                                : ""
                            }
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Vitrine">Vitrine</SelectItem>
                            <SelectItem value="Encomenda">Encomenda</SelectItem>
                          </SelectContent>
                        </Select>
                        {item.newType !== item.originalType && (
                          <p className="text-xs text-orange-600">
                            Original: {item.originalType}
                          </p>
                        )}
                      </div>

                      {/* Cliente (apenas para encomendas) */}
                      {item.newType === "Encomenda" && (
                        <div className="space-y-2">
                          <Label htmlFor={`client-${item.id}`}>Cliente</Label>
                          <Input
                            id={`client-${item.id}`}
                            value={item.newClientName || ""}
                            onChange={(e) =>
                              updateItem(
                                item.id,
                                "newClientName",
                                e.target.value
                              )
                            }
                            className={
                              item.newClientName !== item.originalClientName
                                ? "border-orange-400"
                                : ""
                            }
                            placeholder="Nome do cliente"
                          />
                          {item.newClientName !== item.originalClientName && (
                            <p className="text-xs text-orange-600">
                              Original:{" "}
                              {item.originalClientName || "Não informado"}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Data de entrega (apenas para encomendas) */}
                      {item.newType === "Encomenda" && (
                        <div className="space-y-2">
                          <Label htmlFor={`delivery-${item.id}`}>
                            Data de Entrega
                          </Label>
                          <Input
                            id={`delivery-${item.id}`}
                            type="date"
                            value={item.newDeliveryDate || ""}
                            onChange={(e) =>
                              updateItem(
                                item.id,
                                "newDeliveryDate",
                                e.target.value
                              )
                            }
                            className={
                              item.newDeliveryDate !== item.originalDeliveryDate
                                ? "border-orange-400"
                                : ""
                            }
                          />
                          {item.newDeliveryDate !==
                            item.originalDeliveryDate && (
                            <p className="text-xs text-orange-600">
                              Original:{" "}
                              {item.originalDeliveryDate
                                ? new Date(
                                    item.originalDeliveryDate
                                  ).toLocaleDateString("pt-BR")
                                : "Não informado"}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Observação (apenas para encomendas) - campo de largura completa */}
                    {item.newType === "Encomenda" && (
                      <div className="space-y-2 mt-4">
                        <Label htmlFor={`observation-${item.id}`}>
                          Observação
                        </Label>
                        <Input
                          id={`observation-${item.id}`}
                          value={item.newObservation || ""}
                          onChange={(e) =>
                            updateItem(
                              item.id,
                              "newObservation",
                              e.target.value
                            )
                          }
                          className={
                            item.newObservation !== item.originalObservation
                              ? "border-orange-400"
                              : ""
                          }
                          placeholder="Adicione observações sobre a encomenda"
                          maxLength={500}
                        />
                        {item.newObservation !== item.originalObservation && (
                          <p className="text-xs text-orange-600">
                            Original:{" "}
                            {item.originalObservation || "Não informado"}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || changesCount === 0}>
              {isSubmitting
                ? "Enviando..."
                : `Enviar ${changesCount} Solicitação(ões)`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
