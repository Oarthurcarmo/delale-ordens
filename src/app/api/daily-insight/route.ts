import { NextResponse } from "next/server";
import { getTodayInsight, cleanupOldInsights } from "@/server/ai-insight";
import { db } from "@/server/db";
import { dailyInsight } from "@/server/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/daily-insight - Buscar insight do dia
export async function GET() {
  try {
    const insight = await getTodayInsight();

    return NextResponse.json({
      success: true,
      insight,
      date: new Date().toISOString().split("T")[0],
    });
  } catch (error) {
    console.error("Erro ao buscar insight do dia:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao gerar insight do dia",
      },
      { status: 500 }
    );
  }
}

// POST /api/daily-insight/cleanup - Limpar insights antigos (admin)
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === "cleanup") {
      const deletedCount = await cleanupOldInsights();

      return NextResponse.json({
        success: true,
        message: `${deletedCount} insights antigos removidos`,
        deletedCount,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Ação não reconhecida",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Erro ao processar ação:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao processar solicitação",
      },
      { status: 500 }
    );
  }
}

// GET /api/daily-insight/history - Buscar histórico de insights
export async function history() {
  try {
    const insights = await db
      .select()
      .from(dailyInsight)
      .orderBy(desc(dailyInsight.date))
      .limit(30);

    return NextResponse.json({
      success: true,
      insights,
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
