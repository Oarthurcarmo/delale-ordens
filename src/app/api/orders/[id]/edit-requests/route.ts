import { db } from "@/server/db";
import { editRequests } from "@/server/schema";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/server/auth";
import { createEditRequestSchema } from "@/server/validators";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const token = cookies().get("session")?.value;
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const payload = await verifyToken(token);
  if (!payload || !payload.sub) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsedData = createEditRequestSchema.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json(
        { errors: parsedData.error.errors },
        { status: 400 }
      );
    }

    const { description } = parsedData.data;

    const newRequest = await db
      .insert(editRequests)
      .values({
        orderId: params.id,
        requesterId: parseInt(payload.sub),
        description,
      })
      .returning();

    return NextResponse.json(
      { message: "Edit request created", request: newRequest[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating edit request:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
