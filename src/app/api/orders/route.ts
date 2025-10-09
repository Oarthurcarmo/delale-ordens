import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/server/db";
import { verifyToken } from "@/server/auth";
import { orders, orderItems } from "@/server/schema";
import { createOrderSchema } from "@/server/validators";
import { generateOrderCode } from "@/server/id";
import { eq } from "drizzle-orm";
import { sendNewOrderNotification } from "@/server/email";

// GET Orders
export async function GET() {
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

  try {
    let userOrders;
    if (user.role === "manager") {
      userOrders = await db.query.orders.findMany({
        where: eq(orders.storeId, user.storeId!),
        with: {
          manager: true,
          store: true,
          items: { with: { product: true } },
          productionUpdater: true,
        },
        orderBy: (orders, { desc }) => [desc(orders.createdAt)],
      });
    } else {
      userOrders = await db.query.orders.findMany({
        with: {
          manager: true,
          store: true,
          items: { with: { product: true } },
          productionUpdater: true,
        },
        orderBy: (orders, { desc }) => [desc(orders.createdAt)],
      });
    }
    return NextResponse.json(userOrders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST new Order
export async function POST(req: Request) {
  const token = (await cookies()).get("session")?.value;
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const payload = await verifyToken(token);
  if (!payload || !payload.sub) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsedData = createOrderSchema.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json(
        { errors: parsedData.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { storeId, items } = parsedData.data;

    const newOrder = await db
      .insert(orders)
      .values({
        code: generateOrderCode(),
        storeId,
        managerId: parseInt(payload.sub),
      })
      .returning();

    const orderId = newOrder[0].id;
    await db.insert(orderItems).values(
      items.map((item) => ({
        orderId,
        ...item,
        deliveryDate: item.deliveryDate ? item.deliveryDate : null,
      }))
    );

    // Buscar informações para o e-mail
    const manager = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, parseInt(payload.sub as string)),
    });

    const store = await db.query.stores.findFirst({
      where: (stores, { eq }) => eq(stores.id, storeId),
    });

    // Buscar e-mail do supervisor
    const supervisor = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.role, "supervisor"),
    });

    // Enviar e-mail de notificação (não bloqueia a resposta)
    if (manager && store && supervisor) {
      sendNewOrderNotification({
        orderCode: newOrder[0].code,
        storeName: store.name,
        managerName: manager.name,
        itemsCount: items.length,
        supervisorEmail: supervisor.email,
      }).catch((error) => console.error("Email notification failed:", error));
    }

    return NextResponse.json(
      { message: "Order created", order: newOrder[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
