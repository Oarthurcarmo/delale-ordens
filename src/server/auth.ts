import * as jose from "jose";

function getSecret(): Uint8Array {
  const secretValue = process.env.JWT_SECRET;
  if (typeof secretValue !== "string" || secretValue.trim().length === 0) {
    throw new Error(
      "JWT_SECRET não configurada. Defina uma chave segura em .env.local (ex.: JWT_SECRET=uma_chave_bem_grande)"
    );
  }
  return new TextEncoder().encode(secretValue);
}

const alg = "HS256";

export async function signToken(payload: { sub: string; role: string }) {
  const secret = getSecret();
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg })
    .setExpirationTime("2h")
    .setSubject(payload.sub)
    .sign(secret);
}

export async function verifyToken(token: string) {
  try {
    const secret = getSecret();
    const { payload } = await jose.jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}
