import { db } from "@/server/db";
import { products } from "@/server/schema";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/server/auth";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateProductSchema = z.object({
  name: z.string().min(1),
  isClassA: z.boolean(),
});

// GET single product
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const product = await db.query.products.findFirst({
      where: eq(products.id, parseInt(params.id)),
    });

    if (!product) {
      return NextResponse.json(
        { message: "Produto não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { message: "Erro ao buscar produto" },
      { status: 500 }
    );
  }
}

// UPDATE product
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

  // Apenas owner e supervisor podem editar produtos
  if (payload.role !== "owner" && payload.role !== "supervisor") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validatedData = updateProductSchema.parse(body);

    const updatedProduct = await db
      .update(products)
      .set(validatedData)
      .where(eq(products.id, parseInt(params.id)))
      .returning();

    if (!updatedProduct.length) {
      return NextResponse.json(
        { message: "Produto não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Produto atualizado com sucesso",
      product: updatedProduct[0],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating product:", error);
    return NextResponse.json(
      { message: "Erro ao atualizar produto" },
      { status: 500 }
    );
  }
}

// DELETE product
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

  // Apenas owner pode deletar produtos
  if (payload.role !== "owner") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const deletedProduct = await db
      .delete(products)
      .where(eq(products.id, parseInt(params.id)))
      .returning();

    if (!deletedProduct.length) {
      return NextResponse.json(
        { message: "Produto não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Produto deletado com sucesso",
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { message: "Erro ao deletar produto" },
      { status: 500 }
    );
  }
}
