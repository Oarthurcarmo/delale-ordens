"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ProductionStatusBadge } from "./ProductionStatusBadge";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Clock, User, Calendar } from "lucide-react";

interface ProductionStatusManagerProps {
  orderId: string;
  currentStatus:
    | "awaiting_start"
    | "in_progress"
    | "completed"
    | null;
  lastUpdatedBy?: string | null;
  lastUpdatedAt?: string | null;
  onUpdate?: () => void;
}

const statusOptions = [
  { value: "awaiting_start", label: "AGUARDANDO INÍCIO" },
  { value: "in_progress", label: "FAZENDO" },
  { value: "completed", label: "FEITO" },
];

export function ProductionStatusManager({
  orderId,
  currentStatus,
  lastUpdatedBy,
  lastUpdatedAt,
  onUpdate,
}: ProductionStatusManagerProps) {
  const [selectedStatus, setSelectedStatus] = useState(
    currentStatus || "awaiting_start"
  );
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateStatus = async () => {
    if (selectedStatus === currentStatus) {
      toast.info("O status já está definido como " + getStatusLabel(selectedStatus));
      return;
    }

    try {
      setIsUpdating(true);

      const response = await fetch(
        `/api/orders/${orderId}/production-status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ productionStatus: selectedStatus }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Erro ao atualizar status");
      }

      toast.success("Status de produção atualizado com sucesso!");
      onUpdate?.();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao atualizar status de produção"
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusLabel = (status: string) => {
    return statusOptions.find((opt) => opt.value === status)?.label || status;
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Status de Produção
        </CardTitle>
        <CardDescription>
          Atualize o status conforme o progresso da produção
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Atual */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Status Atual</label>
          <div>
            <ProductionStatusBadge status={currentStatus} size="md" />
          </div>
        </div>

        {/* Última Atualização */}
        {lastUpdatedAt && (
          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">Atualizado por</p>
                <p>{lastUpdatedBy || "Sistema"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">Data/Hora</p>
                <p>{formatDate(lastUpdatedAt)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Divisor */}
        <div className="border-t pt-4" />

        {/* Atualizar Status */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Alterar Status</label>
          <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as typeof selectedStatus)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={handleUpdateStatus}
            disabled={isUpdating || selectedStatus === currentStatus}
            className="w-full"
          >
            {isUpdating ? "Atualizando..." : "Atualizar Status"}
          </Button>
        </div>

        {/* Guia Rápido */}
        <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-2">
          <p className="font-medium">Guia Rápido:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• AGUARDANDO INÍCIO → Pedido confirmado, aguardando início da produção</li>
            <li>• FAZENDO → Pedido em produção</li>
            <li>• FEITO → Pedido finalizado e pronto</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

