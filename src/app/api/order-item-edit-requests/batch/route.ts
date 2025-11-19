import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/server/db";
import { orderItemEditRequests, orderItems } from "@/server/schema";
import { eq, inArray } from "drizzle-orm";
import { verifyToken } from "@/server/auth";
import { batchOrderItemEditRequestSchema } from "@/server/validators";

// POST - Aprovar ou rejeitar múltiplas solicitações em lote
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

    // Apenas supervisores podem aprovar/reprovar
    if (user.role !== "supervisor" && user.role !== "owner") {
      return NextResponse.json(
        { message: "Apenas supervisores podem aprovar/reprovar edições" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsedData = batchOrderItemEditRequestSchema.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json(
        { errors: parsedData.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { requestIds, decision } = parsedData.data;

    // Buscar todas as solicitações
    const requests = await db.query.orderItemEditRequests.findMany({
      where: inArray(orderItemEditRequests.id, requestIds),
    });

    if (requests.length !== requestIds.length) {
      return NextResponse.json(
        { message: "Uma ou mais solicitações não foram encontradas" },
        { status: 404 }
      );
    }

    // Verificar se todas estão pendentes
    const pendingRequests = requests.filter((req) => req.status === "pending");
    if (pendingRequests.length !== requests.length) {
      return NextResponse.json(
        { message: "Uma ou mais solicitações já foram processadas" },
        { status: 400 }
      );
    }

    // Processar em transação
    const results = {
      approved: 0,
      rejected: 0,
      deleted: 0,
      updated: 0,
    };

    for (const request of requests) {
      // Se aprovado, aplicar as mudanças no item
      if (decision === "approved") {
        // Se quantidade nova é 0, deletar o item
        if (request.newQuantity === 0) {
          await db
            .delete(orderItems)
            .where(eq(orderItems.id, request.orderItemId));
          results.deleted++;
        } else {
          // Caso contrário, atualizar o item
          await db
            .update(orderItems)
            .set({
              stock: request.newStock!,
              quantity: request.newQuantity!,
              type: request.newType!,
              clientName: request.newClientName,
              deliveryDate: request.newDeliveryDate,
              observation: request.newObservation,
            })
            .where(eq(orderItems.id, request.orderItemId));
          results.updated++;
        }
        results.approved++;
      } else {
        results.rejected++;
      }

      // Atualizar status da solicitação
      await db
        .update(orderItemEditRequests)
        .set({
          status: decision,
          decidedBy: user.id,
          decidedAt: new Date(),
        })
        .where(eq(orderItemEditRequests.id, request.id));
    }

    const actionText = decision === "approved" ? "aprovadas" : "rejeitadas";
    const message = `${requests.length} solicitação(ões) ${actionText} com sucesso. ${results.approved > 0 ? `${results.updated} item(s) atualizado(s), ${results.deleted} item(s) excluído(s).` : ""}`;

    return NextResponse.json({
      message,
      results,
    });
  } catch (error) {
    console.error("Erro ao processar solicitações em lote:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
