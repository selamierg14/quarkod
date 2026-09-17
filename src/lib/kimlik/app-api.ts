import "server-only";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../cekirdek/db";
import { alanDogrula } from "../cekirdek/desenler";
import { SINIRLAR, hizSiniriMesaji, hizSiniriUygula } from "./hiz-siniri";
import { jetonIptalMi } from "./jeton-iptal";
import {
  appJetonCoz,
  appOturumIptalSebebi,
  bearerJetonu,
} from "./app-oturum";
import { plusGecerliMi } from "../biyerlere/biyerlere-plus";

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
  /** Biyerlere Plus üyesi mi — bkz. AppUser.plusUyeMi şema yorumu. */
  plusUyeMi: boolean;
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

  // Kullanıcı satırı ve iptal kaydı birlikte: iptal kontrolü istek başına
  // ek bir tur gecikme eklemesin.
  const [kullanici, iptal] = await Promise.all([
    prisma.appUser.findUnique({
    where: { id: cozulen.id },
    select: {
      id: true,
      username: true,
      name: true,
      puan: true,
      referralCode: true,
      active: true,
      passwordChangedAt: true,
      plusUyeMi: true,
      plusBitis: true,
    },
    }),
    jetonIptalMi(cozulen.jti),
  ]);

  // Çıkış yapılmış (sunucuda iptal edilmiş) jeton geçmiyor.
  if (iptal) return null;
  if (appOturumIptalSebebi(kullanici, cozulen.issuedAt)) return null;
  if (!kullanici) return null;

  return {
    id: kullanici.id,
    username: kullanici.username,
    name: kullanici.name,
    puan: kullanici.puan,
    referralCode: kullanici.referralCode,
    plusUyeMi: plusGecerliMi(kullanici),
  };
}

/** İstekteki ham Bearer jetonu (doğrulanmamış). */
export function bearerJetonuOku(request: Request): string | null {
  return bearerJetonu(request.headers.get("authorization"));
}

/** Girişi zorunlu kılan uçlar için: yoksa 401 döndürür. */
export async function appKullaniciGerekli(
  request: Request,
): Promise<{ kullanici: AppKullanici } | { yanit: NextResponse }> {
  const kullanici = await appKullaniciOku(request);
  if (!kullanici) return { yanit: apiHata("Oturum geçersiz.", 401) };

  /**
   * OTURUMLU HER YAZMAYA GENEL HIZ SINIRI — kimlikten hemen sonra, merkezde.
   *
   * Favori, ilgi, push aboneliği ve konum uçlarında hiç sınır yoktu; bir
   * betik saniyede yüzlerce yazma yaptırabiliyordu. Sınırı her uca tek tek
   * koymak, bir sonraki eklenen ucun unutulması demek (politika tablosunun
   * "unutulan uç" gerekçesinin aynısı). Kendi daha sıkı sınırı olan uçlar
   * (ziyaret, şifre, OTP) bunun ÜSTÜNE kendi sınırlarını uyguluyor.
   */
  if (request.method !== "GET" && request.method !== "HEAD") {
    const sinir = await hizSiniriUygula(SINIRLAR.yazma, kullanici.id);
    if (!sinir.izin) return { yanit: apiHata(hizSiniriMesaji(sinir), 429) };
  }

  return { kullanici };
}

/**
 * Kabul edilen en büyük JSON gövdesi (bayt).
 *
 * Uçların hiçbiri birkaç kilobayttan büyük bir gövde beklemiyor (en uzunu
 * 400 karakterlik buluşma açıklaması). Sınır yokken kimlik doğrulaması
 * istemeyen giriş ucuna 9 MB'lık gövde gönderilebiliyor ve her istekte
 * tamamı belleğe alınıp ayrıştırılıyordu (canlı ölçüldü).
 */
export const EN_BUYUK_GOVDE_BAYT = 32 * 1024;

/**
 * İstek gövdesini güvenle JSON olarak okur; uygun değilse null.
 *
 * Üç kapı:
 *
 *   1. İÇERİK TÜRÜ `application/json` OLMALI. Tarayıcılar `text/plain`
 *      gövdeyi başka bir siteden ÖN KONTROLSÜZ gönderebiliyor; o tür kabul
 *      edildiği için kötü niyetli bir sayfa, ziyaretçilerinin tarayıcısını
 *      açık uçlara (kayıt, giriş, şifre kurtarma SMS'i) istek attırmak için
 *      kullanabiliyordu — her ziyaretçi ayrı bir IP, yani IP sınırları da
 *      işe yaramıyor. `application/json` ön kontrol gerektiriyor ve üretimde
 *      CORS kapalı olduğu için tarayıcı isteği hiç göndermiyor. Canlı
 *      doğrulandı: text/plain ile giriş denemesi işleniyordu.
 *   2. BOYUT. `content-length` yalan söyleyebilir ya da hiç olmayabilir
 *      (parçalı aktarım); gövde akış olarak okunuyor ve sınır aşıldığı an
 *      bırakılıyor, tamamı belleğe alınmıyor.
 *   3. JSON NESNESİ. Bozuk JSON, dizi ya da düz değer istisna fırlatıp
 *      500'e düşmüyor, null dönüyor ve çağıran 400 veriyor.
 */
export async function govdeOku(request: Request): Promise<Record<string, unknown> | null> {
  const tur = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!tur.startsWith("application/json")) return null;

  const beyan = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(beyan) && beyan > EN_BUYUK_GOVDE_BAYT) return null;

  if (!request.body) return null;
  const okuyucu = request.body.getReader();
  const parcalar: Uint8Array[] = [];
  let toplam = 0;
  try {
    for (;;) {
      const { done, value } = await okuyucu.read();
      if (done) break;
      toplam += value.byteLength;
      if (toplam > EN_BUYUK_GOVDE_BAYT) {
        await okuyucu.cancel().catch(() => {});
        return null;
      }
      parcalar.push(value);
    }
    const metinGovde = new TextDecoder().decode(Buffer.concat(parcalar));
    const veri: unknown = JSON.parse(metinGovde);
    return veri && typeof veri === "object" && !Array.isArray(veri)
      ? (veri as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** Gövdeden bir metin alanını okur; yoksa boş dize. */
export function metin(govde: Record<string, unknown>, alan: string): string {
  const deger = govde[alan];
  return typeof deger === "string" ? deger.trim() : "";
}

/**
 * OTURUM İÇİNDE MEVCUT ŞİFREYİ DOĞRULAR — hassas işlemlerin ortak kapısı.
 *
 * Dört uçta (şifre değiştirme, kurtarma numarası ekleme/silme, hesap
 * silme) aynı üç adım ayrı ayrı yazılmıştı ve ayrışmıştı: birinde hız
 * sınırı hiç yoktu, birinde şifre kontrolünden SONRA geliyordu, ikisinde
 * önce. Sıra önemli çünkü sınır bcrypt'ten sonra gelirse şifre tahmini
 * sınırsız yapılabiliyor.
 *
 * Sıra: uzunluk (bcrypt maliyeti girdiyle artıyor) → hız sınırı (dört uç
 * ortak kota) → bcrypt.
 */
export async function mevcutSifreyiDogrula(
  appUserId: string,
  ham: string,
): Promise<{ ok: true } | { ok: false; yanit: NextResponse }> {
  const sifre = alanDogrula(ham, "girisSifresi", "Mevcut şifre", { zorunlu: true });
  if (!sifre.ok) return { ok: false, yanit: apiHata("Mevcut şifre hatalı.", 400) };

  const sinir = await hizSiniriUygula(SINIRLAR.sifreDogrulama, appUserId);
  if (!sinir.izin) return { ok: false, yanit: apiHata(hizSiniriMesaji(sinir), 429) };

  const hesap = await prisma.appUser.findUnique({
    where: { id: appUserId },
    select: { passwordHash: true },
  });
  if (!hesap) return { ok: false, yanit: apiHata("Hesap bulunamadı.", 404) };
  if (!(await bcrypt.compare(sifre.deger, hesap.passwordHash))) {
    return { ok: false, yanit: apiHata("Mevcut şifre hatalı.", 400) };
  }
  return { ok: true };
}
