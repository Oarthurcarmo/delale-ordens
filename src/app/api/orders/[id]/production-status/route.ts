import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/server/db";
import { orders } from "@/server/schema";
import { eq } from "drizzle-orm";
import { verifyToken } from "@/server/auth";

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

    // Apenas supervisores e donos podem atualizar status de produção
    if (user.role !== "supervisor" && user.role !== "owner") {
      return NextResponse.json(
        { message: "Apenas supervisores podem atualizar status de produção" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { productionStatus } = body;

    // Validar status
    const validStatuses = [
      "awaiting_start",
      "in_progress",
      "completed",
    ];

    if (!validStatuses.includes(productionStatus)) {
      return NextResponse.json(
        { message: "Status de produção inválido" },
        { status: 400 }
      );
    }

    // Verificar se o pedido existe
    const existingOrder = await db.query.orders.findFirst({
      where: eq(orders.id, id),
    });

    if (!existingOrder) {
      return NextResponse.json(
        { message: "Pedido não encontrado" },
        { status: 404 }
      );
    }

    // Atualizar status de produção
    const [updatedOrder] = await db
      .update(orders)
      .set({
        productionStatus,
        productionUpdatedBy: user.id,
        productionUpdatedAt: new Date(),
        updatedAt: new Date(),
        // Atualizar status geral baseado no status de produção
        ...(productionStatus === "in_progress"
          ? { status: "in_production" }
          : {}),
        ...(productionStatus === "completed"
          ? { status: "completed" }
          : {}),
      })
      .where(eq(orders.id, id))
      .returning();

    return NextResponse.json({
      message: "Status de produção atualizado com sucesso",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Erro ao atualizar status de produção:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

