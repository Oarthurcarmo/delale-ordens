import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/server/db";
import { orderItemEditRequests, orderItems } from "@/server/schema";
import { eq, and } from "drizzle-orm";
import { verifyToken } from "@/server/auth";
import { requestStatus } from "@/server/schema";
import { createOrderItemEditRequestsSchema } from "@/server/validators";

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
        where.push(
          eq(
            orderItemEditRequests.status,
            status as (typeof requestStatus.enumValues)[number]
          )
        );
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

    // Apenas gerentes e donos podem solicitar edições
    if (user.role !== "manager" && user.role !== "owner") {
      return NextResponse.json(
        { message: "Apenas gerentes e donos podem solicitar edições" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsedData = createOrderItemEditRequestsSchema.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json(
        {
          message: "Dados inválidos",
          errors: parsedData.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { requests } = parsedData.data;
    const createdRequests = [];

    for (const requestData of requests) {
      const {
        orderItemId,
        newStock,
        newQuantity,
        newType,
        newClientName,
        newDeliveryDate,
        newObservation,
      } = requestData;

      // Buscar item original
      const originalItem = await db.query.orderItems.findFirst({
        where: eq(orderItems.id, orderItemId),
      });

      if (!originalItem) {
        return NextResponse.json(
          { message: `Item ${orderItemId} não encontrado` },
          { status: 404 }
        );
      }

      // Verificar se pelo menos um campo foi alterado
      const hasChanges =
        (newStock !== undefined && newStock !== originalItem.stock) ||
        (newQuantity !== undefined && newQuantity !== originalItem.quantity) ||
        (newType !== undefined && newType !== originalItem.type) ||
        (newClientName !== undefined &&
          newClientName !== originalItem.clientName) ||
        (newDeliveryDate !== undefined &&
          newDeliveryDate !== originalItem.deliveryDate) ||
        (newObservation !== undefined &&
          newObservation !== originalItem.observation);

      if (!hasChanges) {
        continue; // Pula itens sem alterações
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
          originalObservation: originalItem.observation,
          newStock: newStock ?? originalItem.stock,
          newQuantity: newQuantity ?? originalItem.quantity,
          newType: newType ?? originalItem.type,
          newClientName: newClientName ?? originalItem.clientName,
          newDeliveryDate: newDeliveryDate ?? originalItem.deliveryDate,
          newObservation: newObservation ?? originalItem.observation,
        })
        .returning();

      createdRequests.push(request);
    }

    if (createdRequests.length === 0) {
      return NextResponse.json(
        { message: "Nenhuma alteração foi detectada" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: `${createdRequests.length} solicitação(ões) de edição criada(s) com sucesso`,
      requests: createdRequests,
    });
  } catch (error) {
    console.error("Erro ao criar solicitação:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
