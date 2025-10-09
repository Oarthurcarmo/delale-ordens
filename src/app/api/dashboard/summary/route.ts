import { db } from "@/server/db";
import { orders, orderItems, products, stores } from "@/server/schema";
import { count, desc, eq, sum } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const ordersByStore = await db
      .select({
        storeName: stores.name,
        count: count(orders.id),
      })
      .from(orders)
      .leftJoin(stores, eq(orders.storeId, stores.id))
      .groupBy(stores.name);

    const topProducts = await db
      .select({
        productName: products.name,
        totalQuantity: sum(orderItems.quantity),
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .groupBy(products.name)
      .orderBy(desc(sum(orderItems.quantity)))
      .limit(5);

    return NextResponse.json({ ordersByStore, topProducts });
  } catch (error) {
    console.error("Error fetching summary data:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
