import { db } from "@/server/db";
import { products } from "@/server/schema";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/server/auth";
import { z } from "zod";

const createProductSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  isClassA: z.boolean().default(true),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const includeAll = searchParams.get("all") === "true";

  try {
    if (includeAll) {
      // Retorna todos os produtos (para admin)
      const allProducts = await db.query.products.findMany({
        orderBy: (products, { desc }) => [desc(products.id)],
      });
      return NextResponse.json(allProducts);
    }

    // Retorna apenas produtos Classe A (para criação de pedidos)
    const classAProducts = await db.query.products.findMany({
      where: (products, { eq }) => eq(products.isClassA, true),
      orderBy: (products, { asc }) => [products.name],
    });
    return NextResponse.json(classAProducts);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { message: "Internal server error" },
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

  // Apenas owner e supervisor podem criar produtos
  if (payload.role !== "owner" && payload.role !== "supervisor") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validatedData = createProductSchema.parse(body);

    const newProduct = await db
      .insert(products)
      .values(validatedData)
      .returning();

    return NextResponse.json(
      {
        message: "Produto criado com sucesso",
        product: newProduct[0],
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating product:", error);
    return NextResponse.json(
      { message: "Erro ao criar produto" },
      { status: 500 }
    );
  }
}
