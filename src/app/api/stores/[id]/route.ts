import { db } from "@/server/db";
import { stores } from "@/server/schema";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/server/auth";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateStoreSchema = z.object({
  name: z.string().min(1),
});

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const store = await db.query.stores.findFirst({
      where: eq(stores.id, parseInt(params.id)),
    });

    if (!store) {
      return NextResponse.json(
        { message: "Loja não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(store);
  } catch (error) {
    console.error("Error fetching store:", error);
    return NextResponse.json(
      { message: "Erro ao buscar loja" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const token = (await cookies()).get("session")?.value;
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload || !payload.sub) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (payload.role !== "owner") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validatedData = updateStoreSchema.parse(body);

    const updatedStore = await db
      .update(stores)
      .set(validatedData)
      .where(eq(stores.id, parseInt(params.id)))
      .returning();

    if (!updatedStore.length) {
      return NextResponse.json(
        { message: "Loja não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Loja atualizada com sucesso",
      store: updatedStore[0],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating store:", error);
    return NextResponse.json(
      { message: "Erro ao atualizar loja" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const token = (await cookies()).get("session")?.value;
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload || !payload.sub) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (payload.role !== "owner") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const deletedStore = await db
      .delete(stores)
      .where(eq(stores.id, parseInt(params.id)))
      .returning();

    if (!deletedStore.length) {
      return NextResponse.json(
        { message: "Loja não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Loja deletada com sucesso",
    });
  } catch (error) {
    console.error("Error deleting store:", error);
    return NextResponse.json(
      {
        message:
          "Erro ao deletar loja. Verifique se não há usuários ou pedidos vinculados.",
      },
      { status: 500 }
    );
  }
}
