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
          <DialogTitle className="text-2xl">Resumo do Pedido</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Total de Itens:</strong> {totalItems} unidades
            </p>
          </div>

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
              {items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    {item.productName}
                  </TableCell>
                  <TableCell>{item.stock}</TableCell>
                  <TableCell className="font-bold">{item.quantity}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.type === "Encomenda" ? "destructive" : "secondary"
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
                            {new Date(item.deliveryDate).toLocaleDateString(
                              "pt-BR"
                            )}
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
