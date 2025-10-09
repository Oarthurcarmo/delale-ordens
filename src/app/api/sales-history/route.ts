import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { salesHistory, products } from "@/server/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/sales-history?productId=1&year=2024&startYear=2022&endYear=2024
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const year = searchParams.get("year");
    const startYear = searchParams.get("startYear");
    const endYear = searchParams.get("endYear");

    // Caso 1: Histórico de um produto específico
    if (productId) {
      const conditions = [eq(salesHistory.productId, parseInt(productId))];

      if (year) {
        conditions.push(eq(salesHistory.year, parseInt(year)));
      } else if (startYear && endYear) {
        conditions.push(
          and(
            gte(salesHistory.year, parseInt(startYear)),
            lte(salesHistory.year, parseInt(endYear))
          )!
        );
      }

      const history = await db
        .select({
          id: salesHistory.id,
          year: salesHistory.year,
          month: salesHistory.month,
          total: salesHistory.total,
          productName: products.name,
          productId: products.id,
        })
        .from(salesHistory)
        .innerJoin(products, eq(salesHistory.productId, products.id))
        .where(and(...conditions))
        .orderBy(salesHistory.year, salesHistory.month);

      return NextResponse.json({ history });
    }

    // Caso 2: Top produtos por vendas
    if (year) {
      const topProducts = await db
        .select({
          productId: salesHistory.productId,
          productName: products.name,
          totalSales: sql<number>`SUM(${salesHistory.total})`.as("total_sales"),
        })
        .from(salesHistory)
        .innerJoin(products, eq(salesHistory.productId, products.id))
        .where(eq(salesHistory.year, parseInt(year)))
        .groupBy(salesHistory.productId, products.name)
        .orderBy(desc(sql`SUM(${salesHistory.total})`))
        .limit(10);

      return NextResponse.json({ topProducts });
    }

    // Caso 3: Resumo geral de todos os produtos
    const summary = await db
      .select({
        productId: salesHistory.productId,
        productName: products.name,
        totalSales: sql<number>`SUM(${salesHistory.total})`.as("total_sales"),
        avgMonthlySales: sql<number>`AVG(${salesHistory.total})`.as(
          "avg_monthly_sales"
        ),
        minSales: sql<number>`MIN(${salesHistory.total})`.as("min_sales"),
        maxSales: sql<number>`MAX(${salesHistory.total})`.as("max_sales"),
      })
      .from(salesHistory)
      .innerJoin(products, eq(salesHistory.productId, products.id))
      .groupBy(salesHistory.productId, products.name)
      .orderBy(desc(sql`SUM(${salesHistory.total})`));

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Error fetching sales history:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales history" },
      { status: 500 }
    );
  }
}
