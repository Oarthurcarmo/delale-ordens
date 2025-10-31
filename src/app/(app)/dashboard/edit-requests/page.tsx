"use client";

import { useAuth } from "@/lib/auth-context";
import useSWR from "swr";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};

interface EditRequest {
  id: number;
  description: string;
  status: string;
  order: {
    code: string;
    store: {
      name: string;
    };
    manager: {
      name: string;
    };
  };
  requester: {
    name: string;
  };
}

export default function EditRequestsPage() {
  const { user } = useAuth();
  const { data: editRequests, mutate } = useSWR<EditRequest[]>(
    "/api/edit-requests?status=pending",
    fetcher,
    { refreshInterval: 30000 }
  );

  const handleDecideEditRequest = async (requestId: number, status: string) => {
    try {
      const response = await fetch(`/api/edit-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        toast.success(
          `Solicitação ${status === "approved" ? "aprovada" : "rejeitada"} com sucesso`
        );
        mutate();
      } else {
        toast.error("Erro ao processar solicitação");
      }
    } catch {
      toast.error("Erro ao processar solicitação");
    }
  };

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
        <h2 className="text-3xl font-bold">Solicitações de Edição</h2>
        <p className="text-muted-foreground">
          Gerencie todas as solicitações de edição de pedidos
        </p>
      </div>

      {editRequests && editRequests.length > 0 ? (
        <div className="space-y-4">
          {editRequests.map((request) => (
            <Card key={request.id} className="border-yellow-500 border-2">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <p className="font-semibold mb-1">
                      Pedido: {request.order.code}
                    </p>
                    <p className="text-sm text-muted-foreground mb-2">
                      {request.order.store.name} - {request.requester.name}
                    </p>
                    <p className="text-sm bg-muted p-3 rounded-md">
                      {request.description}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() =>
                        handleDecideEditRequest(request.id, "approved")
                      }
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        handleDecideEditRequest(request.id, "rejected")
                      }
                    >
                      <X className="h-4 w-4 mr-1" />
                      Rejeitar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Nenhuma Solicitação Pendente</CardTitle>
            <CardDescription>
              Não há solicitações de edição aguardando aprovação no momento.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
