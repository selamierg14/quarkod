"use client";

import { BIYERLERE_JETON_ANAHTARI } from "@/lib/biyerlere-jeton";

/**
 * Biyerlere'nin `/api/app/*` uçlarına istemciden istek atan tek nokta.
 *
 * Kimlik Bearer jetonuyla taşınıyor (bkz. lib/app-oturum.ts) — panelin
 * çerezli oturumundan bilerek farklı. Bu fonksiyon jetonu OturumSaglayici'nin
 * kendisinden değil doğrudan localStorage'dan okuyor ki her çağıran tarafın
 * context'i prop olarak taşımasına gerek kalmasın.
 */

export type ApiSonuc<T> = { ok: true; veri: T } | { ok: false; hata: string; durum: number };

async function govdeCoz<T>(response: Response): Promise<ApiSonuc<T>> {
  let govde: unknown;
  try {
    govde = await response.json();
  } catch {
    return { ok: false, hata: "Sunucudan geçersiz yanıt geldi.", durum: response.status };
  }
  if (!response.ok) {
    const mesaj =
      govde && typeof govde === "object" && "hata" in govde && typeof govde.hata === "string"
        ? govde.hata
        : "Bir şeyler ters gitti.";
    return { ok: false, hata: mesaj, durum: response.status };
  }
  return { ok: true, veri: govde as T };
}

function jetonOku(): string | null {
  try {
    return localStorage.getItem(BIYERLERE_JETON_ANAHTARI);
  } catch {
    return null;
  }
}

/** Girişsiz erişilebilen uçlar için (ör. keşfet listesi, mekan detayı). */
export async function appGet<T>(yol: string): Promise<ApiSonuc<T>> {
  try {
    const response = await fetch(yol, { headers: { Accept: "application/json" } });
    return await govdeCoz<T>(response);
  } catch {
    return { ok: false, hata: "Bağlantı kurulamadı. İnternetini kontrol et.", durum: 0 };
  }
}

/** Jeton varsa ekler, yoksa girişsiz devam eder — çağıran taraf 401'i ele alır. */
export async function appAuthGet<T>(yol: string): Promise<ApiSonuc<T>> {
  const jeton = jetonOku();
  try {
    const response = await fetch(yol, {
      headers: {
        Accept: "application/json",
        ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}),
      },
    });
    return await govdeCoz<T>(response);
  } catch {
    return { ok: false, hata: "Bağlantı kurulamadı. İnternetini kontrol et.", durum: 0 };
  }
}

export async function appAuthPost<T>(
  yol: string,
  gövde?: Record<string, unknown>,
): Promise<ApiSonuc<T>> {
  const jeton = jetonOku();
  try {
    const response = await fetch(yol, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}),
      },
      body: JSON.stringify(gövde ?? {}),
    });
    return await govdeCoz<T>(response);
  } catch {
    return { ok: false, hata: "Bağlantı kurulamadı. İnternetini kontrol et.", durum: 0 };
  }
}
