import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/server/db";
import { verifyToken } from "@/server/auth";
import { calculateProductSuggestions } from "@/server/prediction";

/**
 * POST /api/predictions
 * Retorna sugestões de quantidade para todos os produtos
 * Body: { stocks?: { [productId: number]: number } }
 */
export async function POST(req: Request) {
  const token = (await cookies()).get("session")?.value;
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload || !payload.sub) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, parseInt(payload.sub as string)),
  });

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Apenas gerentes e donos podem ver sugestões
  if (user.role !== "manager" && user.role !== "owner") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (!user.storeId && user.role === "manager") {
    return NextResponse.json(
      { message: "Manager must have a store" },
      { status: 400 }
    );
  }

  try {
    // Para owner, usar storeId 1 por padrão
    const storeId = user.storeId || 1;

    // Obter estoques do body (opcional)
    const body = await req.json().catch(() => ({}));
    const stocks = body.stocks || {};

    // Converter para Map
    const stockMap = new Map<number, number>();
    Object.entries(stocks).forEach(([productId, quantity]) => {
      stockMap.set(parseInt(productId), quantity as number);
    });

    // Calcular sugestões considerando estoques atuais
    const suggestions = await calculateProductSuggestions(storeId, stockMap);

    return NextResponse.json({
      success: true,
      suggestions,
      storeId,
    });
  } catch (error) {
    console.error("Error calculating predictions:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
