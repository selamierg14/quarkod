import { SignJWT, jwtVerify } from "jose";

/**
 * Oturum jetonu üretimi/doğrulaması. Node'a özgü bağımlılık içermez ki
 * middleware (edge runtime) de kullanabilsin.
 */

export const SESSION_COOKIE = "mm_session";
export const SESSION_MAX_AGE = 60 * 60 * 12; // 12 saat

export type Role = "owner" | "manager";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** owner için null — üç işletmeyi de görür. */
  businessId: string | null;
};

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET tanımlı değil veya çok kısa. .env dosyasına en az 32 karakterlik bir değer yazın.",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    name: user.name,
    email: user.email,
    role: user.role,
    businessId: user.businessId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.email !== "string" || typeof payload.role !== "string") {
      return null;
    }
    return {
      id: String(payload.sub),
      name: String(payload.name ?? ""),
      email: payload.email,
      role: payload.role as Role,
      businessId: (payload.businessId as string | null) ?? null,
    };
  } catch {
    return null;
  }
}
