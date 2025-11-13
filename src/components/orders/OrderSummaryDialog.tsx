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


interface OrderItem {
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
  const totalEncomendas = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalProduction = items.reduce(
    (sum, item) => sum + item.productionQuantity,
    0
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-auto p-4">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl md:text-2xl font-bold">
            📋 Revisão do Pedido
          </DialogTitle>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Confira todos os detalhes antes de enviar
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumo do Pedido */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-3 sm:p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl md:text-2xl">📦</span>
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300">
                    Total de Produtos
                  </p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {items.length}
                  </p>
                </div>
              </div>
            </div>

            {totalEncomendas > 0 && (
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 p-3 sm:p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2">
                  <span className="text-lg sm:text-xl md:text-2xl">🎂</span>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-purple-700 dark:text-purple-300">
                      Encomendas
                    </p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold text-purple-900 dark:text-purple-100">
                      {totalEncomendas}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {totalProduction > 0 && (
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 p-3 sm:p-4 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <span className="text-lg sm:text-xl md:text-2xl">🏭</span>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-green-700 dark:text-green-300">
                      Para Produção
                    </p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-900 dark:text-green-100">
                      {totalProduction}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle px-4 sm:px-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2">
                    <TableHead className="font-semibold text-xs sm:text-sm">Produto</TableHead>
                    <TableHead className="text-center font-semibold bg-blue-50 dark:bg-blue-950/20 text-xs sm:text-sm">
                      Estoque
                    </TableHead>
                    <TableHead className="text-center font-semibold bg-purple-50 dark:bg-purple-950/20 text-xs sm:text-sm">
                      Encomendas
                    </TableHead>
                    <TableHead className="text-center font-semibold bg-green-50 dark:bg-green-950/20 text-xs sm:text-sm">
                      Produção
                    </TableHead>
                    <TableHead className="font-semibold text-xs sm:text-sm hidden lg:table-cell">
                      Detalhes da Encomenda
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index} className="hover:bg-muted/50">
                      <TableCell className="font-medium text-xs sm:text-sm md:text-base py-2 sm:py-4">
                        {item.productName}
                      </TableCell>
                      <TableCell className="text-center bg-blue-50 dark:bg-blue-950/20 py-2 sm:py-4">
                        <div className="inline-flex items-center gap-1 px-1.5 sm:px-3 py-0.5 sm:py-1 rounded bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
                          <span className="text-xs sm:text-sm font-semibold">
                            {item.stock}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center bg-purple-50 dark:bg-purple-950/20 py-2 sm:py-4">
                        {item.quantity > 0 ? (
                          <div className="inline-flex items-center gap-1 px-1.5 sm:px-3 py-0.5 sm:py-1 rounded bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800">
                            <span className="text-xs sm:text-base md:text-lg font-bold text-purple-700 dark:text-purple-300">
                              {item.quantity}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs sm:text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center bg-green-50 dark:bg-green-950/20 py-2 sm:py-4">
                        {item.productionQuantity > 0 ? (
                          <div className="inline-flex items-center gap-1 px-1.5 sm:px-3 py-0.5 sm:py-1 rounded bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
                            <span className="text-xs sm:text-base md:text-lg font-bold text-green-700 dark:text-green-300">
                              {item.productionQuantity}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs sm:text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="min-w-[250px] sm:min-w-[300px] hidden lg:table-cell py-2 sm:py-4">
                        {item.clientName ? (
                          <div className="text-xs sm:text-sm space-y-1.5">
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
                                  {new Date(
                                    item.deliveryDate + "T00:00:00"
                                  ).toLocaleDateString("pt-BR")}
                                </div>
                              </div>
                            )}
                            {item.observation && (
                              <div className="mt-2 p-2 sm:p-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
                                <div className="flex items-start gap-2">
                                  <span className="text-amber-600 dark:text-amber-400 mt-0.5">
                                    💬
                                  </span>
                                  <div className="flex-1">
                                    <strong className="text-amber-900 dark:text-amber-100">
                                      Observação:
                                    </strong>
                                    <p className="text-amber-800 dark:text-amber-200 mt-0.5">
                                      {item.observation}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs sm:text-sm">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Detalhes mobile - mostrado apenas em telas pequenas */}
          <div className="lg:hidden space-y-3">
            {items.map((item, index) => (
              item.clientName && (
                <div key={index} className="p-3 bg-muted/50 rounded-lg border">
                  <h4 className="font-semibold text-xs sm:text-sm mb-2">{item.productName}</h4>
                  <div className="text-xs space-y-1.5">
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
                          {new Date(
                            item.deliveryDate + "T00:00:00"
                          ).toLocaleDateString("pt-BR")}
                        </div>
                      </div>
                    )}
                    {item.observation && (
                      <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
                        <div className="flex items-start gap-2">
                          <span className="text-amber-600 dark:text-amber-400 mt-0.5">
                            💬
                          </span>
                          <div className="flex-1">
                            <strong className="text-amber-900 dark:text-amber-100 text-xs">
                              Observação:
                            </strong>
                            <p className="text-amber-800 dark:text-amber-200 mt-0.5 text-xs">
                              {item.observation}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            ))}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="w-full sm:w-auto text-xs sm:text-sm"
          >
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={isSubmitting} className="w-full sm:w-auto text-xs sm:text-sm">
            {isSubmitting ? "Enviando..." : "Confirmar e Enviar Pedido"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
