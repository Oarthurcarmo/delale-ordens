import { db } from "@/server/db";
import { stores } from "@/server/schema";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/server/auth";
import { z } from "zod";

const createStoreSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
});

export async function GET() {
  try {
    const allStores = await db.query.stores.findMany({
      orderBy: (stores, { asc }) => [asc(stores.name)],
    });
    return NextResponse.json(allStores);
  } catch (error) {
    console.error("Error fetching stores:", error);
    return NextResponse.json(
      { message: "Erro ao buscar lojas" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const token = (await cookies()).get("session")?.value;
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload || !payload.sub) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Apenas owner pode criar lojas
  if (payload.role !== "owner") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validatedData = createStoreSchema.parse(body);

    const newStore = await db.insert(stores).values(validatedData).returning();

    return NextResponse.json(
      {
        message: "Loja criada com sucesso",
        store: newStore[0],
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: error.flatten().fieldErrors },
        { status: 400 } 
      );
    }
    console.error("Error creating store:", error);
    return NextResponse.json(
      { message: "Erro ao criar loja" },
      { status: 500 }
    );
  }
}
