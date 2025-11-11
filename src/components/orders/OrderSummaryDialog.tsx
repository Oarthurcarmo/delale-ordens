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

interface OrderItem {
  productId: number;
  productName: string;
  stock: number;
  quantity: number;
  type: "Vitrine" | "Encomenda";
  clientName?: string;
  deliveryDate?: string;
  observation?: string;
}

interface OrderSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: OrderItem[];
  onConfirm: () => void;
  isSubmitting: boolean;
}

export function OrderSummaryDialog({
  open,
  onOpenChange,
  items,
  onConfirm,
  isSubmitting,
}: OrderSummaryDialogProps) {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl! max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            📋 Revisão do Pedido
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Confira todos os detalhes antes de enviar
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📦</span>
              <div>
                <p className="text-sm font-semibold text-primary">
                  Total de Encomendas
                </p>
                <p className="text-2xl font-bold text-primary">
                  {totalItems} unidades
                </p>
              </div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="border-b-2">
                <TableHead className="font-semibold">Produto</TableHead>
                <TableHead className="text-center font-semibold">Estoque</TableHead>
                <TableHead className="text-center font-semibold">Quantidade</TableHead>
                <TableHead className="font-semibold">Detalhes da Encomenda</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={index} className="hover:bg-muted/50">
                  <TableCell className="font-medium text-base">
                    {item.productName}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 dark:bg-blue-950/20">
                      <span className="text-sm font-medium">{item.stock}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="inline-flex items-center gap-1 px-3 py-1 rounded bg-primary/10 border border-primary/20">
                      <span className="text-lg font-bold text-primary">{item.quantity}</span>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-[300px]">
                    {item.clientName ? (
                      <div className="text-sm space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">👤</span>
                          <div>
                            <strong>Cliente:</strong> {item.clientName}
                          </div>
                        </div>
                        {item.deliveryDate && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">📅</span>
                            <div>
                              <strong>Entrega:</strong>{" "}
                              {new Date(item.deliveryDate + "T00:00:00").toLocaleDateString(
                                "pt-BR"
                              )}
                            </div>
                          </div>
                        )}
                        {item.observation && (
                          <div className="mt-2 p-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
                            <div className="flex items-start gap-2">
                              <span className="text-amber-600 dark:text-amber-400 mt-0.5">💬</span>
                              <div className="flex-1">
                                <strong className="text-amber-900 dark:text-amber-100">Observação:</strong>
                                <p className="text-amber-800 dark:text-amber-200 mt-0.5">
                                  {item.observation}
                                </p>
                              </div>
                            </div>
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

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? "Enviando..." : "Confirmar e Enviar Pedido"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
