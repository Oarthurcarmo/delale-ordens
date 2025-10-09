"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface EditRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderCode: string;
  onSuccess: () => void;
}

export function EditRequestForm({
  open,
  onOpenChange,
  orderId,
  orderCode,
  onSuccess,
}: EditRequestFormProps) {
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (description.length < 10) {
      toast.error("A descrição deve ter pelo menos 10 caracteres");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/orders/${orderId}/edit-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });

      if (response.ok) {
        setDescription("");
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar Edição do Pedido</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm">
                <strong>Pedido:</strong> {orderCode}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Descreva as alterações necessárias *
              </Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full min-h-[120px] px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Explique detalhadamente o que precisa ser alterado no pedido..."
                required
                minLength={10}
              />
              <p className="text-xs text-muted-foreground">
                Mínimo de 10 caracteres ({description.length}/10)
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Atenção:</strong> Esta solicitação será enviada para
                aprovação do supervisor. Você será notificado por e-mail sobre a
                decisão.
              </p>
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
            <Button
              type="submit"
              disabled={isSubmitting || description.length < 10}
            >
              {isSubmitting ? "Enviando..." : "Enviar Solicitação"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
