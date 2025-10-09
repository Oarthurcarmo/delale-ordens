import { db } from "@/server/db";
import { eq } from "drizzle-orm";
import { orders } from "@/server/schema";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        manager: true,
        store: true,
        items: {
          with: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error(`Error fetching order:`, error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
