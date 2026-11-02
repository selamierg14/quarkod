import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

export const VISITOR_COOKIE = "mm_ziyaretci";
const VISITOR_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Tarayıcı başına rastgele kimlik.
 *
 * Kafede herkes aynı Wi-Fi IP'sini paylaştığı için tekrar kontrolünün ve
 * tamamlama oranı ölçümünün asıl dayanağı IP değil bu çerezdir. Kişiyi
 * tanımlayan bir bilgi taşımaz, sadece "aynı tarayıcı mı" sorusunu cevaplar.
 *
 * Yalnızca server action'lardan çağrılabilir (render sırasında çerez yazılamaz).
 */
export async function getOrCreateVisitorId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(VISITOR_COOKIE)?.value;
  if (existing) return existing;

  const id = randomBytes(12).toString("base64url");
  store.set(VISITOR_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: VISITOR_MAX_AGE,
  });
  return id;
}
