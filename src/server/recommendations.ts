import { db } from "./db";
import { products, productForecasts } from "./schema";
import { eq } from "drizzle-orm";

export interface ProductRecommendation {
  productId: number;
  productName: string;
  forecast: number;
  stock: number;
  orders: number;
  suggestedProduction: number;
}

/**
 * Calculate production suggestion based on the Excel formula:
 * 
 * IF (orders > forecast):
 *   production = orders + forecast - stock
 * ELSE:
 *   production = forecast - stock + orders
 * 
 * @param forecast - Average daily forecast for the product
 * @param stock - Current stock (Estoque Atual)
 * @param orders - Current orders/encomendas
 * @returns Suggested production quantity
 */
export function calculateProductionSuggestion(
  forecast: number,
  stock: number,
  orders: number
): number {
  let production: number;

  if (orders > forecast) {
    // If orders exceed forecast, produce enough for both
    production = orders + forecast - stock;
  } else {
    // Otherwise, base on forecast with order consideration
    production = forecast - stock + orders;
  }

  // Never suggest negative production
  return Math.max(0, Math.round(production));
}

/**
 * Get recommendations for all products with their forecasts
 * @param orderItems - Map of productId to { stock, orders }
 * @returns Array of product recommendations
 */
export async function getProductRecommendations(
  orderItems: Map<number, { stock: number; orders: number }>
): Promise<ProductRecommendation[]> {
  // Fetch all products with their forecasts
  const productsWithForecasts = await db
    .select({
      productId: products.id,
      productName: products.name,
      forecast: productForecasts.averageDailyForecast,
    })
    .from(products)
    .leftJoin(
      productForecasts,
      eq(products.id, productForecasts.productId)
    )
    .where(eq(products.isClassA, true));

  const recommendations: ProductRecommendation[] = [];

  for (const product of productsWithForecasts) {
    const forecast = product.forecast || 0;
    const orderData = orderItems.get(product.productId) || {
      stock: 0,
      orders: 0,
    };

    const suggestedProduction = calculateProductionSuggestion(
      forecast,
      orderData.stock,
      orderData.orders
    );

    recommendations.push({
      productId: product.productId,
      productName: product.productName,
      forecast,
      stock: orderData.stock,
      orders: orderData.orders,
      suggestedProduction,
    });
  }

  return recommendations;
}

/**
 * Get forecast for a single product
 * @param productId - Product ID
 * @returns Average daily forecast or null if not found
 */
export async function getProductForecast(
  productId: number
): Promise<number | null> {
  const result = await db
    .select({
      forecast: productForecasts.averageDailyForecast,
    })
    .from(productForecasts)
    .where(eq(productForecasts.productId, productId))
    .limit(1);

  return result.length > 0 ? result[0].forecast : null;
}

