import { NextResponse } from "next/server";

// Headers CORS para permitir requisições
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie",
  "Access-Control-Allow-Credentials": "true",
};

/**
 * Adiciona headers CORS a uma resposta NextResponse
 */
export function withCors(response: NextResponse): NextResponse {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

/**
 * Retorna uma resposta JSON com headers CORS
 */
export function corsResponse(data: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, {
    ...init,
    headers: {
      ...corsHeaders,
      ...init?.headers,
    },
  });
}

/**
 * Handler padrão para requisições OPTIONS (preflight)
 */
export async function handleOptions() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}
