import { createHash } from "node:crypto";

/**
 * İSTEĞİ ATANIN IP'Sİ — projedeki TEK okuma yeri.
 *
 * Sorun neydi: IP dört ayrı dosyada (hız sınırı, giriş kilidi, anket sel
 * koruması, deneme hesabı sınırı) aynı satırla okunuyordu:
 *
 *     x-forwarded-for başlığının İLK elemanı
 *
 * Bu değeri istemci yazıyor. Ölçüldü: Next, gelen `X-Forwarded-For`'u
 * olduğu gibi geçiriyor, gerçek bağlantı adresini eklemiyor. Başlığı her
 * istekte değiştiren bir betik, IP tabanlı her sınırı aşıyordu — kayıt
 * ucuna 12 farklı sahte IP ile 12 istek atıldı, hiçbiri 429 almadı (aynı
 * IP'den 6.sı alıyordu).
 *
 * KURAL: yalnızca ÖNÜMÜZDEKİ ALTYAPININ YAZDIĞI başlığa güvenilir.
 *
 *   1. `GUVENILIR_IP_BASLIGI` tanımlıysa o başlık (kendi vekil
 *      sunucunuz — ör. nginx `X-Real-IP` yazıyorsa "x-real-ip").
 *   2. Vercel'de `x-vercel-forwarded-for`, yoksa `x-real-ip`. Vercel bu
 *      başlıkları kendisi yazıyor, istemcinin gönderdiğini eziyor.
 *   3. Yerel geliştirmede güvenilir kaynak yok; `x-forwarded-for` okunuyor
 *      ama bu yalnızca geliştirme kolaylığı, koruma değil.
 *   4. ÜRETİMDE güvenilir kaynak yoksa TEK ORTAK KOVA ("guvenilmez")
 *      dönüyor ve bir kez hata günlüğe yazılıyor. Sahtelenebilen bir değeri
 *      kimlik saymak "sınır yok" demekti; ortak kova ise en azından sınırı
 *      uyguluyor. Bedeli meşru kullanıcıların birbirinin kotasını yemesi —
 *      bu bir yapılandırma hatasının görünür olması için kabul edilen bedel.
 */

type BaslikOkuyucu = { get(ad: string): string | null };

let uyarildi = false;

function ilkEleman(deger: string | null): string {
  return deger?.split(",")[0]?.trim() ?? "";
}

export function istemciIp(basliklar: BaslikOkuyucu, ortam: NodeJS.ProcessEnv = process.env): string {
  const ozel = ortam.GUVENILIR_IP_BASLIGI?.trim().toLowerCase();
  if (ozel) return ilkEleman(basliklar.get(ozel)) || "guvenilmez";

  if (ortam.VERCEL === "1") {
    return (
      ilkEleman(basliklar.get("x-vercel-forwarded-for")) ||
      ilkEleman(basliklar.get("x-real-ip")) ||
      "guvenilmez"
    );
  }

  if (ortam.NODE_ENV !== "production") {
    return ilkEleman(basliklar.get("x-forwarded-for"));
  }

  if (!uyarildi) {
    uyarildi = true;
    console.error(
      "[güvenlik] Güvenilir IP başlığı yok: GUVENILIR_IP_BASLIGI tanımlayın. " +
        "IP tabanlı sınırlar şimdilik tek ortak kovada uygulanıyor.",
    );
  }
  return "guvenilmez";
}

/**
 * IP'nin özeti — ham IP hiçbir tabloya yazılmıyor (KVKK: en az veri).
 * Sayaçların ihtiyacı kimliğin kendisi değil, "aynı kaynak mı" sorusunun
 * cevabı.
 */
export function ipOzeti(ip: string): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}
