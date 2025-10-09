import { cookies } from "next/headers";
import { corsResponse, handleOptions } from "@/lib/cors";

export const OPTIONS = handleOptions;

export async function POST() {
  (await cookies()).delete("session");
  return corsResponse({ message: "Logout realizado com sucesso" });
}
