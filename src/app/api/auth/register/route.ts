import { db } from "@/server/db";
import { users } from "@/server/schema";
import { registerSchema } from "@/server/validators";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsedData = registerSchema.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json(
        { message: "Invalid input", errors: parsedData.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, username, password, role, storeId } = parsedData.data;

    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, username),
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Username already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await db.insert(users).values({
      name,
      email,
      username,
      passwordHash,
      role,
      storeId,
    });

    return NextResponse.json(
      { message: "User created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
