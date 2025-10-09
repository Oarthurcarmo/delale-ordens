import { db } from "@/server/db";
import { orders } from "@/server/schema";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/server/auth";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateStatusSchema = z.object({
  status: z.enum(["pending", "in_production", "completed", "cancelled"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = (await cookies()).get("session")?.value;
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload || !payload.sub) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Apenas supervisor e owner podem atualizar status
  if (payload.role !== "supervisor" && payload.role !== "owner") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = updateStatusSchema.parse(body);

    const updatedOrder = await db
      .update(orders)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();

    if (!updatedOrder.length) {
      return NextResponse.json(
        { message: "Pedido não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Status atualizado com sucesso",
      order: updatedOrder[0],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error("Error updating order status:", error);
    return NextResponse.json(
      { message: "Erro ao atualizar status" },
      { status: 500 }
    );
  }
}
