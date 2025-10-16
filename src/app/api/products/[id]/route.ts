import { db } from "@/server/db";
import { products, orderItems, salesHistory } from "@/server/schema";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/server/auth";
import { eq, count } from "drizzle-orm";
import { z } from "zod";

const updateProductSchema = z.object({
  name: z.string().min(1),
  isClassA: z.boolean(),
});

// GET single product
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await db.query.products.findFirst({
      where: eq(products.id, parseInt(id)),
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

  // Apenas owner e supervisor podem editar produtos
  if (payload.role !== "owner" && payload.role !== "supervisor") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const validatedData = updateProductSchema.parse(body);

    const updatedProduct = await db
      .update(products)
      .set(validatedData)
      .where(eq(products.id, parseInt(id)))
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
        { message: "Dados inválidos", errors: error.flatten().fieldErrors },
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

  // Apenas owner pode deletar produtos
  if (payload.role !== "owner") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const productId = parseInt(id);

    // Verificar se o produto existe
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });

    if (!product) {
      return NextResponse.json(
        { message: "Produto não encontrado" },
        { status: 404 }
      );
    }

    // Verificar se o produto está sendo usado em pedidos
    const ordersUsingProduct = await db
      .select({ count: count() })
      .from(orderItems)
      .where(eq(orderItems.productId, productId));

    const orderCount = ordersUsingProduct[0]?.count || 0;

    if (orderCount > 0) {
      return NextResponse.json(
        {
          message: `Não é possível excluir este produto. Ele está sendo usado em ${orderCount} ${
            orderCount === 1 ? "pedido" : "pedidos"
          }.`,
          error: "PRODUCT_IN_USE",
          usageCount: orderCount,
        },
        { status: 409 } // 409 Conflict
      );
    }

    // Verificar se o produto tem histórico de vendas
    const salesUsingProduct = await db
      .select({ count: count() })
      .from(salesHistory)
      .where(eq(salesHistory.productId, productId));

    const salesCount = salesUsingProduct[0]?.count || 0;

    if (salesCount > 0) {
      return NextResponse.json(
        {
          message: `Não é possível excluir este produto. Ele possui ${salesCount} ${
            salesCount === 1 ? "registro" : "registros"
          } de histórico de vendas.`,
          error: "PRODUCT_HAS_SALES_HISTORY",
          salesCount: salesCount,
        },
        { status: 409 } // 409 Conflict
      );
    }

    // Se passou por todas as verificações, pode deletar
    const deletedProduct = await db
      .delete(products)
      .where(eq(products.id, productId))
      .returning();

    return NextResponse.json({
      message: "Produto deletado com sucesso",
      product: deletedProduct[0],
    });
  } catch (error) {
    console.error("Error deleting product:", error);

    // Capturar erros de constraint do banco de dados
    if (error instanceof Error) {
      if (error.message.includes("foreign key constraint")) {
        return NextResponse.json(
          {
            message:
              "Não é possível excluir este produto pois ele está sendo referenciado em outros registros.",
            error: "FOREIGN_KEY_CONSTRAINT",
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { message: "Erro ao deletar produto" },
      { status: 500 }
    );
  }
}
