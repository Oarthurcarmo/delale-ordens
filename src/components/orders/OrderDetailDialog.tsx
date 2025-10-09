"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { EditRequestForm } from "./EditRequestForm";
import { toast } from "sonner";

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
}

interface OrderDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  canRequestEdit?: boolean;
}

export function OrderDetailDialog({
  open,
  onOpenChange,
  order,
  canRequestEdit = false,
}: OrderDetailDialogProps) {
  const [showEditRequestForm, setShowEditRequestForm] = useState(false);

  if (!order) return null;

  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

  const handleEditRequestSuccess = () => {
    setShowEditRequestForm(false);
    toast.success("Solicitação de edição enviada com sucesso!");
  };

  return (
    <>
      <Dialog open={open && !showEditRequestForm} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl!">
          <DialogHeader>
            <DialogTitle className="text-2xl">Detalhes do Pedido</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Código</p>
                <p className="font-semibold">{order.code}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Loja</p>
                <p className="font-semibold">{order.store.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gerente</p>
                <p className="font-semibold">{order.manager.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data de Criação</p>
                <p className="font-semibold">
                  {new Date(order.createdAt).toLocaleString("pt-BR")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Itens</p>
                <p className="font-semibold">{totalItems} unidades</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Itens do Pedido</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Estoque</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.product.name}
                        </TableCell>
                        <TableCell>{item.stock}</TableCell>
                        <TableCell className="font-bold">
                          {item.quantity}
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
                          {item.type === "Encomenda" && item.clientName ? (
                            <div className="text-sm">
                              <div>
                                <strong>Cliente:</strong> {item.clientName}
                              </div>
                              {item.deliveryDate && (
                                <div>
                                  <strong>Entrega:</strong>{" "}
                                  {new Date(
                                    item.deliveryDate
                                  ).toLocaleDateString("pt-BR")}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            {canRequestEdit && (
              <Button onClick={() => setShowEditRequestForm(true)}>
                Solicitar Edição
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {canRequestEdit && (
        <EditRequestForm
          open={showEditRequestForm}
          onOpenChange={setShowEditRequestForm}
          orderId={order.id}
          orderCode={order.code}
          onSuccess={handleEditRequestSuccess}
        />
      )}
    </>
  );
}
