import { db } from "@/server/db";
import { loginSchema } from "@/server/validators";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { signToken } from "@/server/auth";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsedData = loginSchema.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: parsedData.error.flatten() },
        { status: 400 }
      );
    }

    const credentials = parsedData.data as
      | { username: string; password: string }
      | { email: string; password: string };

    // Busca por username ou email
    const user = await db.query.users.findFirst({
      where: (users, { eq }) =>
        "username" in credentials
          ? eq(users.username, credentials.username)
          : eq(users.email, credentials.email),
    });

    if (!user) {
      return NextResponse.json(
        { message: "Credenciais inválidas" },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(
      credentials.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      return NextResponse.json(
        { message: "Credenciais inválidas" },
        { status: 401 }
      );
    }

    const token = await signToken({ sub: user.id.toString(), role: user.role });

    (await cookies()).set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "strict",
    });

    return NextResponse.json({ message: "Login realizado com sucesso" });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
