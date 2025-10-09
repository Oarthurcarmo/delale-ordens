import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/server/db";
import { orderItemEditRequests, orderItems } from "@/server/schema";
import { eq } from "drizzle-orm";
import { verifyToken } from "@/server/auth";

// PATCH - Aprovar ou reprovar solicitação
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = (await cookies()).get("session")?.value;
    if (!token) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.sub) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, parseInt(payload.sub!)),
    });

    if (!user) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    // Apenas supervisores podem aprovar/reprovar
    if (user.role !== "supervisor" && user.role !== "owner") {
      return NextResponse.json(
        { message: "Apenas supervisores podem aprovar/reprovar edições" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { decision } = body; // "approved" ou "rejected"

    if (!["approved", "rejected"].includes(decision)) {
      return NextResponse.json(
        { message: "Decisão inválida. Use 'approved' ou 'rejected'" },
        { status: 400 }
      );
    }

    // Buscar solicitação
    const request = await db.query.orderItemEditRequests.findFirst({
      where: eq(orderItemEditRequests.id, parseInt(id)),
    });

    if (!request) {
      return NextResponse.json(
        { message: "Solicitação não encontrada" },
        { status: 404 }
      );
    }

    if (request.status !== "pending") {
      return NextResponse.json(
        { message: "Esta solicitação já foi processada" },
        { status: 400 }
      );
    }

    // Se aprovado, aplicar as mudanças no item
    if (decision === "approved") {
      await db
        .update(orderItems)
        .set({
          stock: request.newStock!,
          quantity: request.newQuantity!,
          type: request.newType!,
          clientName: request.newClientName,
          deliveryDate: request.newDeliveryDate,
        })
        .where(eq(orderItems.id, request.orderItemId));
    }

    // Atualizar solicitação
    const [updatedRequest] = await db
      .update(orderItemEditRequests)
      .set({
        status: decision,
        decidedBy: user.id,
        decidedAt: new Date(),
      })
      .where(eq(orderItemEditRequests.id, parseInt(id)))
      .returning();

    return NextResponse.json({
      message: `Solicitação ${decision === "approved" ? "aprovada" : "rejeitada"} com sucesso`,
      request: updatedRequest,
    });
  } catch (error) {
    console.error("Erro ao processar solicitação:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
