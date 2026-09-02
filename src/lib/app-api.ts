import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "./db";
import {
  appJetonCoz,
  appOturumIptalSebebi,
  bearerJetonu,
} from "./app-oturum";

/**
 * Biyerlere mobil uygulamasının API katmanı için ortak yardımcılar.
 *
 * Panel Server Action'larla çalışıyor (form gönderip sayfa tazeleyen bir
 * web arayüzü). Mobil uygulama ise native: form yok, sayfa yok, JSON var.
 * Bu yüzden ayrı bir yüzey — `/api/app/*` — ve ayrı bir kimlik yolu
 * (Bearer jeton, bkz. lib/app-oturum.ts).
 */

export type AppKullanici = {
  id: string;
  username: string;
  name: string;
  puan: number;
  referralCode: string;
};

/** Tutarlı hata gövdesi: mobil taraf tek bir biçim beklesin. */
export function apiHata(mesaj: string, durum: number) {
  return NextResponse.json({ hata: mesaj }, { status: durum });
}

/**
 * İstekteki Bearer jetonundan tüketiciyi çözer.
 *
 * Jeton geçerli olsa bile kullanıcı askıya alınmış ya da şifresini
 * değiştirmiş olabilir; ikisi de veritabanından teyit ediliyor. Jetona
 * güvenip DB'ye bakmamak, askıya alınan bir hesabın 30 gün daha
 * gezinebilmesi demekti.
 */
export async function appKullaniciOku(
  request: Request,
): Promise<AppKullanici | null> {
  const jeton = bearerJetonu(request.headers.get("authorization"));
  if (!jeton) return null;

  const cozulen = await appJetonCoz(jeton);
  if (!cozulen) return null;

  const kullanici = await prisma.appUser.findUnique({
    where: { id: cozulen.id },
    select: {
      id: true,
      username: true,
      name: true,
      puan: true,
      referralCode: true,
      active: true,
      passwordChangedAt: true,
    },
  });

  if (appOturumIptalSebebi(kullanici, cozulen.issuedAt)) return null;
  if (!kullanici) return null;

  return {
    id: kullanici.id,
    username: kullanici.username,
    name: kullanici.name,
    puan: kullanici.puan,
    referralCode: kullanici.referralCode,
  };
}

/** Girişi zorunlu kılan uçlar için: yoksa 401 döndürür. */
export async function appKullaniciGerekli(
  request: Request,
): Promise<{ kullanici: AppKullanici } | { yanit: NextResponse }> {
  const kullanici = await appKullaniciOku(request);
  if (!kullanici) return { yanit: apiHata("Oturum geçersiz.", 401) };
  return { kullanici };
}

/**
 * İstek gövdesini güvenle JSON olarak okur.
 *
 * Bozuk gövde bir istisna fırlatıp 500'e düşmemeli: mobil uygulamanın
 * hatalı bir isteği sunucu hatası gibi görünmesin, 400 alsın.
 */
export async function govdeOku(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const veri = await request.json();
    return veri && typeof veri === "object" ? (veri as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Gövdeden bir metin alanını okur; yoksa boş dize. */
export function metin(govde: Record<string, unknown>, alan: string): string {
  const deger = govde[alan];
  return typeof deger === "string" ? deger.trim() : "";
}
