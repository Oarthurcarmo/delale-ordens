"use client";

import { OwnerOrderDashboard } from "@/components/dashboards/OwnerOrderDashboard";
import { useAuth } from "@/lib/auth-context";

export default function CreateOrderPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Não autorizado</h1>
          <p className="text-muted-foreground">
            Por favor, faça login novamente.
          </p>
        </div>
      </div>
    );
  }

  if (user.role !== "owner") {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Acesso Negado</h1>
          <p className="text-muted-foreground">
            Apenas o dono pode acessar esta página.
          </p>
        </div>
      </div>
    );
  }

  return <OwnerOrderDashboard />;
}

