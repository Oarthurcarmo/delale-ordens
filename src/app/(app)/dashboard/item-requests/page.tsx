"use client";

import { useAuth } from "@/lib/auth-context";
import { OrderItemEditRequestsPanel } from "@/components/admin/OrderItemEditRequestsPanel";

export default function ItemRequestsPage() {
  const { user } = useAuth();

  if (!user || (user.role !== "supervisor" && user.role !== "owner")) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Acesso Negado</h1>
          <p className="text-muted-foreground">
            Apenas supervisores e donos podem acessar esta página.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Edições de Itens</h2>
        <p className="text-muted-foreground">
          Aprove ou rejeite solicitações de edição de itens de pedidos
        </p>
      </div>

      <OrderItemEditRequestsPanel />
    </div>
  );
}
