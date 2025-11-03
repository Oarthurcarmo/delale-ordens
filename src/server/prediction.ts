import { db } from "./db";
import { dailyOrderHistory, salesHistory } from "./schema";
import { eq, and, gte, sql } from "drizzle-orm";

export interface ProductSuggestion {
  productId: number;
  productName: string;
  suggestion: number;
  confidence: "stock" | "intermediate" | "advanced";
  confidenceLabel: string;
  daysOfHistory: number;
}

/**
 * Calcula sugestões de pedido para todos os produtos de uma loja
 * @param storeId - ID da loja
 * @param currentStock - Map com estoque atual de cada produto (productId -> quantidade)
 */
export async function calculateProductSuggestions(
  storeId: number,
  currentStock: Map<number, number> = new Map()
): Promise<ProductSuggestion[]> {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Domingo, 6 = Sábado

  // Buscar todos os produtos
  const allProducts = await db.query.products.findMany();

  // Calcular dias de histórico disponível
  const firstOrderDate = await db
    .select({ minDate: sql<string>`MIN(${dailyOrderHistory.orderDate})` })
    .from(dailyOrderHistory)
    .where(eq(dailyOrderHistory.storeId, storeId));

  let daysOfHistory = 0;
  if (firstOrderDate[0]?.minDate) {
    const firstDate = new Date(firstOrderDate[0].minDate);
    daysOfHistory = Math.floor(
      (today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  const suggestions: ProductSuggestion[] = [];

  for (const product of allProducts) {
    const stock = currentStock.get(product.id) || 0;
    let suggestion: ProductSuggestion | null;

    if (daysOfHistory < 7) {
      // Modo Inicial: Baseado em histórico de vendas
      suggestion = await calculateStockBasedSuggestion(product, daysOfHistory);
    } else if (daysOfHistory < 90) {
      // Modo Intermediário: Baseado em histórico de pedidos
      suggestion = await calculateIntermediateSuggestion(
        product,
        storeId,
        dayOfWeek,
        daysOfHistory
      );
    } else {
      // Modo Avançado: Combina vendas históricas + pedidos + sazonalidade
      suggestion = await calculateAdvancedSuggestion(
        product,
        storeId,
        dayOfWeek,
        today,
        daysOfHistory
      );
    }

    // Se não tiver sugestão (sem dados históricos), pular este produto
    if (!suggestion) {
      continue;
    }

    // Ajustar sugestão considerando estoque atual
    if (stock > 0) {
      const demandaPrevista = suggestion.suggestion;

      if (stock >= demandaPrevista) {
        // Já tem estoque suficiente ou excedente - não precisa pedir
        suggestion.suggestion = 0;
      } else {
        // Precisa pedir a diferença entre demanda e estoque
        suggestion.suggestion = demandaPrevista - stock;
      }
    }

    suggestions.push(suggestion);
  }

  return suggestions;
}

/**
 * Modo Inicial: Sugestão baseada em histórico de vendas
 */
async function calculateStockBasedSuggestion(
  product: { id: number; name: string },
  daysOfHistory: number
): Promise<ProductSuggestion | null> {
  // Buscar dados de histórico de vendas (salesHistory)
  const currentYear = new Date().getFullYear();
  const salesData = await db
    .select({
      total: sql<number>`SUM(${salesHistory.total})`,
      months: sql<number>`COUNT(DISTINCT ${salesHistory.month})`,
    })
    .from(salesHistory)
    .where(
      and(
        eq(salesHistory.productId, product.id),
        gte(salesHistory.year, currentYear - 1) // Últimos 2 anos
      )
    );

  // Se tiver dados de vendas históricas, calcular média diária
  if (salesData[0]?.total && salesData[0]?.months) {
    const totalSales = salesData[0].total;
    const months = salesData[0].months;

    // Calcular média diária baseada em vendas históricas
    // total de vendas / meses / ~30 dias por mês
    const avgDailySales = Math.round(totalSales / (months * 30));

    // Ajustar para cima em 10-15% para garantir estoque
    const suggestion = Math.round(avgDailySales * 1.15);

    return {
      productId: product.id,
      productName: product.name,
      suggestion: Math.max(suggestion, 5), // Mínimo de 5 unidades
      confidence: "intermediate",
      confidenceLabel: `Histórico vendas`,
      daysOfHistory,
    };
  }

  // Se não tem dados de vendas, retornar null
  // O frontend não mostrará sugestão para este produto
  return null;
}

/**
 * Modo Intermediário: Baseado em histórico de pedidos com ajuste por dia da semana
 */
async function calculateIntermediateSuggestion(
  product: { id: number; name: string },
  storeId: number,
  dayOfWeek: number,
  daysOfHistory: number
): Promise<ProductSuggestion> {
  // Buscar média dos últimos 30 dias
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentOrders = await db
    .select({
      avgQuantity: sql<number>`AVG(${dailyOrderHistory.quantityOrdered})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(dailyOrderHistory)
    .where(
      and(
        eq(dailyOrderHistory.productId, product.id),
        eq(dailyOrderHistory.storeId, storeId),
        gte(
          dailyOrderHistory.orderDate,
          thirtyDaysAgo.toISOString().split("T")[0]
        )
      )
    );

  let avgQuantity = recentOrders[0]?.avgQuantity || 0;
  const orderCount = recentOrders[0]?.count || 0;

  // Se tiver poucos pedidos, complementar com dados de vendas históricas
  if (orderCount < 10) {
    const currentYear = new Date().getFullYear();
    const salesData = await db
      .select({
        total: sql<number>`SUM(${salesHistory.total})`,
        months: sql<number>`COUNT(DISTINCT ${salesHistory.month})`,
      })
      .from(salesHistory)
      .where(
        and(
          eq(salesHistory.productId, product.id),
          gte(salesHistory.year, currentYear - 1)
        )
      );

    if (salesData[0]?.total && salesData[0]?.months) {
      const avgDailySales = salesData[0].total / (salesData[0].months * 30);
      // Combinar pedidos recentes com histórico de vendas
      avgQuantity =
        orderCount > 0
          ? avgQuantity * 0.6 + avgDailySales * 0.4 // 60% pedidos, 40% vendas
          : avgDailySales; // Apenas vendas se não tiver pedidos
    }
  }

  // Calcular padrão por dia da semana
  const dayOfWeekPattern = await db
    .select({
      dayOfWeek: dailyOrderHistory.dayOfWeek,
      avgQuantity: sql<number>`AVG(${dailyOrderHistory.quantityOrdered})`,
    })
    .from(dailyOrderHistory)
    .where(
      and(
        eq(dailyOrderHistory.productId, product.id),
        eq(dailyOrderHistory.storeId, storeId),
        gte(
          dailyOrderHistory.orderDate,
          thirtyDaysAgo.toISOString().split("T")[0]
        )
      )
    )
    .groupBy(dailyOrderHistory.dayOfWeek);

  // Calcular fator de ajuste para o dia da semana atual
  let dayAdjustment = 1.0;
  if (dayOfWeekPattern.length > 0) {
    const todayPattern = dayOfWeekPattern.find(
      (d) => d.dayOfWeek === dayOfWeek
    );
    const overallAvg =
      dayOfWeekPattern.reduce((sum, d) => sum + (d.avgQuantity || 0), 0) /
      dayOfWeekPattern.length;

    if (todayPattern && overallAvg > 0) {
      dayAdjustment = (todayPattern.avgQuantity || overallAvg) / overallAvg;
    }
  }

  const suggestion = Math.round((avgQuantity || 15) * dayAdjustment);

  return {
    productId: product.id,
    productName: product.name,
    suggestion: Math.max(suggestion, 5),
    confidence: "intermediate",
    confidenceLabel:
      orderCount >= 10 ? `${daysOfHistory} dias` : `Vendas + ${daysOfHistory}d`,
    daysOfHistory,
  };
}

/**
 * Modo Avançado: Combina histórico de vendas, pedidos e sazonalidade completa
 */
async function calculateAdvancedSuggestion(
  product: { id: number; name: string },
  storeId: number,
  dayOfWeek: number,
  today: Date,
  daysOfHistory: number
): Promise<ProductSuggestion> {
  // 1. Buscar média de vendas mensais (salesHistory)
  const currentYear = today.getFullYear();
  const salesData = await db
    .select({
      total: sql<number>`SUM(${salesHistory.total})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(salesHistory)
    .where(
      and(
        eq(salesHistory.productId, product.id),
        gte(salesHistory.year, currentYear - 1)
      )
    );

  const avgDailySales =
    salesData[0]?.total && salesData[0]?.count
      ? salesData[0].total / (salesData[0].count * 30) // Aproximação de vendas diárias
      : 0;

  // 2. Buscar média de pedidos dos últimos 60 dias
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const recentOrders = await db
    .select({
      avgQuantity: sql<number>`AVG(${dailyOrderHistory.quantityOrdered})`,
    })
    .from(dailyOrderHistory)
    .where(
      and(
        eq(dailyOrderHistory.productId, product.id),
        eq(dailyOrderHistory.storeId, storeId),
        gte(
          dailyOrderHistory.orderDate,
          sixtyDaysAgo.toISOString().split("T")[0]
        )
      )
    );

  const avgOrderQuantity = recentOrders[0]?.avgQuantity || 0;

  // 3. Ajuste por dia da semana
  const dayOfWeekPattern = await db
    .select({
      dayOfWeek: dailyOrderHistory.dayOfWeek,
      avgQuantity: sql<number>`AVG(${dailyOrderHistory.quantityOrdered})`,
    })
    .from(dailyOrderHistory)
    .where(
      and(
        eq(dailyOrderHistory.productId, product.id),
        eq(dailyOrderHistory.storeId, storeId),
        gte(
          dailyOrderHistory.orderDate,
          sixtyDaysAgo.toISOString().split("T")[0]
        )
      )
    )
    .groupBy(dailyOrderHistory.dayOfWeek);

  let dayAdjustment = 1.0;
  if (dayOfWeekPattern.length > 0) {
    const todayPattern = dayOfWeekPattern.find(
      (d) => d.dayOfWeek === dayOfWeek
    );
    const overallAvg =
      dayOfWeekPattern.reduce((sum, d) => sum + (d.avgQuantity || 0), 0) /
      dayOfWeekPattern.length;

    if (todayPattern && overallAvg > 0) {
      dayAdjustment = (todayPattern.avgQuantity || overallAvg) / overallAvg;
    }
  }

  // 4. Ajuste por quinzena (2ª quinzena: -10%)
  const dayOfMonth = today.getDate();
  const quinzenaAdjustment = dayOfMonth > 15 ? 0.9 : 1.0;

  // 5. Combinar dados com pesos
  const baseQuantity =
    avgDailySales > 0 && avgOrderQuantity > 0
      ? avgDailySales * 0.3 + avgOrderQuantity * 0.7 // Mais peso para pedidos recentes
      : avgOrderQuantity > 0
        ? avgOrderQuantity
        : avgDailySales > 0
          ? avgDailySales
          : 20; // Fallback

  const suggestion = Math.round(
    baseQuantity * dayAdjustment * quinzenaAdjustment
  );

  return {
    productId: product.id,
    productName: product.name,
    suggestion: Math.max(suggestion, 5),
    confidence: "advanced",
    confidenceLabel: "Avançado",
    daysOfHistory,
  };
}

/**
 * Mapeamento dos nomes dos dias da semana em português
 */
export function getDayOfWeekName(dayOfWeek: number): string {
  const days = [
    "Domingo",
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
  ];
  return days[dayOfWeek] || "Desconhecido";
}
