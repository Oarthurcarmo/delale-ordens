import { db } from "@/server/db";
import { editRequests } from "@/server/schema";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/server/auth";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  const token = (await cookies()).get("session")?.value;
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload || !payload.sub) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, parseInt(payload.sub!)),
  });

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    let requests;

    if (user.role === "supervisor" || user.role === "owner") {
      // Supervisor e Dono veem todas as solicitações
      if (status) {
        requests = await db.query.editRequests.findMany({
          where: eq(editRequests.status, status as typeof editRequests.status.enumValues[number]),
          with: {
            order: {
              with: {
                store: true,
                manager: true,
              },
            },
            requester: true,
            decider: true,
          },
          orderBy: (editRequests, { desc }) => [desc(editRequests.id)],
        });
      } else {
        requests = await db.query.editRequests.findMany({
          with: {
            order: {
              with: {
                store: true,
                manager: true,
              },
            },
            requester: true,
            decider: true,
          },
          orderBy: (editRequests, { desc }) => [desc(editRequests.id)],
        });
      }
    } else {
      // Gerente vê apenas suas próprias solicitações
      requests = await db.query.editRequests.findMany({
        where: eq(editRequests.requesterId, user.id),
        with: {
          order: {
            with: {
              store: true,
              manager: true,
            },
          },
          requester: true,
          decider: true,
        },
        orderBy: (editRequests, { desc }) => [desc(editRequests.id)],
      });
    }

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Error fetching edit requests:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
