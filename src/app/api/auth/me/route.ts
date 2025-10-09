import { verifyToken } from "@/server/auth";
import { db } from "@/server/db";
import { cookies } from "next/headers";
import { corsResponse, handleOptions } from "@/lib/cors";

export const OPTIONS = handleOptions;

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) {
    return corsResponse({ user: null }, { status: 401 });
  }

  const payload = await verifyToken(token);

  if (!payload || !payload.sub) {
    return corsResponse({ user: null }, { status: 401 });
  }

  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, parseInt(payload.sub!)),
    columns: {
      id: true,
      name: true,
      username: true,
      role: true,
      storeId: true,
    },
  });

  if (!user) {
    return corsResponse({ user: null }, { status: 401 });
  }

  return corsResponse({ user });
}
