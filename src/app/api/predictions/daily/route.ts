import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { dailyForecasts, products } from "@/server/schema";
import { eq, and, gte, lte} from "drizzle-orm";

/**
 * GET /api/predictions/daily
 * Retorna previsões diárias para produtos específicos ou todos os produtos
 * 
 * Query params:
 * - productId: ID do produto (opcional)
 * - startDate: Data inicial (formato YYYY-MM-DD, opcional)
 * - endDate: Data final (formato YYYY-MM-DD, opcional)
 * - date: Data específica (formato YYYY-MM-DD, opcional)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get("productId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const date = searchParams.get("date");

    // Construir query base
    let query = db
      .select({
        id: dailyForecasts.id,
        productId: dailyForecasts.productId,
        productName: products.name,
        forecastDate: dailyForecasts.forecastDate,
        quantity: dailyForecasts.quantity,
      })
      .from(dailyForecasts)
      .innerJoin(products, eq(dailyForecasts.productId, products.id));

    // Aplicar filtros
    const conditions = [];

    if (productId) {
      conditions.push(eq(dailyForecasts.productId, parseInt(productId)));
    }

    if (date) {
      conditions.push(eq(dailyForecasts.forecastDate, date));
    } else {
      if (startDate) {
        conditions.push(gte(dailyForecasts.forecastDate, startDate));
      }
      if (endDate) {
        conditions.push(lte(dailyForecasts.forecastDate, endDate));
      }
    }

    // Aplicar condições se houver
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as unknown as typeof query;
    }

    // Ordenar por data e produto
    const results = await query.orderBy(
      dailyForecasts.forecastDate,
      products.name
    );

    return NextResponse.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error) {
    console.error("Erro ao buscar previsões diárias:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao buscar previsões diárias",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/predictions/daily/today
 * Retorna previsões para o dia de hoje
 */
export async function getTodayForecasts() {
  const today = new Date().toISOString().split("T")[0];

  const results = await db
    .select({
      productId: dailyForecasts.productId,
      productName: products.name,
      quantity: dailyForecasts.quantity,
    })
    .from(dailyForecasts)
    .innerJoin(products, eq(dailyForecasts.productId, products.id))
    .where(eq(dailyForecasts.forecastDate, today))
    .orderBy(products.name);

  return results;
}

