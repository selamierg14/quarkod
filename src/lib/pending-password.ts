import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

/**
 * Şifre değişiminin iki adımı arasında yeni şifreyi taşır.
 *
 * Taşınan değer zaten hash'lenmiş şifredir; düz metin hiçbir yerde durmaz.
 * Çerez imzalıdır ve kısa ömürlüdür — tarayıcıdan başka bir hash yazılıp
 * bilinen bir şifreye geçilmesi mümkün değil.
 */

const COOKIE = "mm_bekleyen_sifre";
const TTL_SECONDS = 10 * 60;

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET tanımlı değil veya çok kısa.");
  }
  return new TextEncoder().encode(secret);
}

export async function setPendingPassword(passwordHash: string) {
  const token = await new SignJWT({ h: passwordHash })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(secretKey());

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export async function readPendingPassword(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const hash = payload.h;
    return typeof hash === "string" ? hash : null;
  } catch {
    return null;
  }
}

export async function clearPendingPassword() {
  const store = await cookies();
  store.delete(COOKIE);
}
