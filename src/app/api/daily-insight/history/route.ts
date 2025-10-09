import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { dailyInsight } from "@/server/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/daily-insight/history - Buscar histórico de insights
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "30");

    const insights = await db
      .select()
      .from(dailyInsight)
      .orderBy(desc(dailyInsight.date))
      .limit(Math.min(limit, 90));

    return NextResponse.json({
      success: true,
      insights: insights.map((i) => ({
        id: i.id,
        date: i.date,
        insight: i.insight,
        createdAt: i.createdAt,
      })),
    });
  } catch (error) {
    console.error("Erro ao buscar histórico:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao buscar histórico de insights",
      },
      { status: 500 }
    );
  }
}
