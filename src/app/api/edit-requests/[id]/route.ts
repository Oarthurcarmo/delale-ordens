import { db } from "@/server/db";
import { editRequests } from "@/server/schema";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/server/auth";
import { updateEditRequestSchema } from "@/server/validators";
import { eq } from "drizzle-orm";
import { sendEditRequestDecisionNotification } from "@/server/email";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const token = cookies().get("session")?.value;
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const payload = await verifyToken(token);
  if (!payload || !payload.sub || payload.role !== "supervisor") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsedData = updateEditRequestSchema.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json(
        { errors: parsedData.error.errors },
        { status: 400 }
      );
    }

    const { status } = parsedData.data;

    const updatedRequest = await db
      .update(editRequests)
      .set({
        status,
        decidedBy: parseInt(payload.sub),
        decidedAt: new Date(),
      })
      .where(eq(editRequests.id, parseInt(params.id)))
      .returning();

    // Buscar informações para enviar e-mail
    const editRequest = await db.query.editRequests.findFirst({
      where: eq(editRequests.id, parseInt(params.id)),
      with: {
        order: true,
        requester: true,
      },
    });

    if (editRequest && editRequest.requester) {
      sendEditRequestDecisionNotification({
        orderCode: editRequest.order.code,
        status,
        managerEmail: editRequest.requester.email,
        managerName: editRequest.requester.name,
      }).catch((error) => console.error("Email notification failed:", error));
    }

    return NextResponse.json(
      { message: "Edit request updated", request: updatedRequest[0] },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating edit request:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
