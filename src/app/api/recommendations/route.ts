import { NextResponse } from "next/server";
import { getProductRecommendations } from "@/server/recommendations";
import { z } from "zod";

const orderItemSchema = z.object({
  productId: z.number(),
  stock: z.number().min(0),
  orders: z.number().min(0),
});

const requestSchema = z.object({
  items: z.array(orderItemSchema),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items } = requestSchema.parse(body);

    // Convert items array to Map for the recommendation service
    const orderItemsMap = new Map<number, { stock: number; orders: number }>();
    
    for (const item of items) {
      orderItemsMap.set(item.productId, {
        stock: item.stock,
        orders: item.orders,
      });
    }

    const recommendations = await getProductRecommendations(orderItemsMap);

    return NextResponse.json({
      success: true,
      recommendations,
    });
  } catch (error) {
    console.error("Error generating recommendations:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Invalid request data", errors: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to generate recommendations" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get recommendations with empty order items (just forecasts)
    const recommendations = await getProductRecommendations(new Map());

    return NextResponse.json({
      success: true,
      recommendations,
    });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch recommendations" },
      { status: 500 }
    );
  }
}

