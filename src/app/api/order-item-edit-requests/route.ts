import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/server/db";
import { orderItemEditRequests, orderItems } from "@/server/schema";
import { eq, and } from "drizzle-orm";
import { verifyToken } from "@/server/auth";
import { requestStatus } from "@/server/schema";

// GET - Listar solicitações de edição
export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const orderId = searchParams.get("orderId");

    const query = db.query.orderItemEditRequests.findMany({
      with: {
        orderItem: {
          with: {
            product: true,
          },
        },
        order: {
          with: {
            store: true,
            manager: true,
          },
        },
        requester: true,
        decider: true,
      },
      orderBy: (requests, { desc }) => [desc(requests.createdAt)],
    });

    // Filtrar por status se fornecido
    let requests;
    if (status || orderId) {
      const where = [];
      if (status) {
        where.push(eq(orderItemEditRequests.status, status as typeof requestStatus.enumValues[number]));
      }
      if (orderId) {
        where.push(eq(orderItemEditRequests.orderId, orderId));
      }
      requests = await db.query.orderItemEditRequests.findMany({
        where: where.length > 1 ? and(...where) : where[0],
        with: {
          orderItem: {
            with: {
              product: true,
            },
          },
          order: {
            with: {
              store: true,
              manager: true,
            },
          },
          requester: true,
          decider: true,
        },
        orderBy: (requests, { desc }) => [desc(requests.createdAt)],
      });
    } else {
      requests = await query;
    }

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Erro ao buscar solicitações:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// POST - Criar nova solicitação de edição
export async function POST(req: NextRequest) {
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

    // Apenas gerentes podem solicitar edições
    if (user.role !== "manager") {
      return NextResponse.json(
        { message: "Apenas gerentes podem solicitar edições" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      orderItemId,
      newStock,
      newQuantity,
      newType,
      newClientName,
      newDeliveryDate,
    } = body;

    // Buscar item original
    const originalItem = await db.query.orderItems.findFirst({
      where: eq(orderItems.id, orderItemId),
    });

    if (!originalItem) {
      return NextResponse.json(
        { message: "Item não encontrado" },
        { status: 404 }
      );
    }

    // Criar solicitação
    const [request] = await db
      .insert(orderItemEditRequests)
      .values({
        orderItemId,
        orderId: originalItem.orderId,
        requesterId: user.id,
        originalStock: originalItem.stock,
        originalQuantity: originalItem.quantity,
        originalType: originalItem.type,
        originalClientName: originalItem.clientName,
        originalDeliveryDate: originalItem.deliveryDate,
        newStock: newStock ?? originalItem.stock,
        newQuantity: newQuantity ?? originalItem.quantity,
        newType: newType ?? originalItem.type,
        newClientName: newClientName ?? originalItem.clientName,
        newDeliveryDate: newDeliveryDate ?? originalItem.deliveryDate,
      })
      .returning();

    return NextResponse.json({
      message: "Solicitação de edição criada com sucesso",
      request,
    });
  } catch (error) {
    console.error("Erro ao criar solicitação:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
