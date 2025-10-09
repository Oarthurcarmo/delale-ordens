import * as jose from "jose";


function getSecret(): Uint8Array {
  const secretValue = process.env.JWT_SECRET;
 
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
  } catch (error: unknown) {
    console.error("Error verifying token:", error);
    return null;
  }
}
