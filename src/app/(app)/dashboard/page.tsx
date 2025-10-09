"use client";

import { ManagerDashboard } from "@/components/dashboards/ManagerDashboard";
import { SupervisorDashboard } from "@/components/dashboards/SupervisorDashboard";
import { OwnerDashboard } from "@/components/dashboards/OwnerDashboard";
import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
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

  const renderDashboard = () => {
    switch (user.role) {
      case "manager":
        return <ManagerDashboard />;
      case "supervisor":
        return <SupervisorDashboard />;
      case "owner":
        return <OwnerDashboard />;
      default:
        return (
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p>Perfil de usuário inválido.</p>
          </div>
        );
    }
  };

  return <>{renderDashboard()}</>;
}
