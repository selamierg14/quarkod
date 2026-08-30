import { createHash } from "node:crypto";

/**
 * İşletme görsellerinin müşteriye hangi adresle verileceği.
 *
 * Logo ve kapak veritabanında data URI (base64) olarak duruyor. Bu, panelde
 * yükleme işini basitleştiriyor ama müşteri tarafında pahalıya patlıyordu —
 * canlıda ölçüldü:
 *
 *   /f/keskinlezzetler/1 → 247 KB HTML, bunun 220 KB'ı (yüzde 89) dört adet
 *   base64 görsel. "Dört" çünkü logo ve kapak ikişer kez geçiyor: bir kez
 *   HTML işaretlemesinde, bir kez de RSC yükünde.
 *
 * Data URI tarayıcı önbelleğine girmez: müşteri karekodu her okuttuğunda
 * aynı 110 KB yeniden iniyordu. Masadaki müşteri bunu mobil veriyle bekliyor.
 *
 * Çözüm görselleri veritabanından çıkarmak değil (yükleme akışı sade
 * kalsın), müşteriye ayrı ve önbelleklenebilir bir adresten vermek. Adres
 * içeriğin özetini taşıyor: görsel değişince adres de değişiyor, bu yüzden
 * uzun süreli önbellek güvenli.
 */

export type GorselTuru = "logo" | "kapak";

/** İçeriğin kısa özeti; adresin taze kalmasını sağlar. */
export function gorselSurumu(dataUrl: string): string {
  return createHash("sha256").update(dataUrl).digest("hex").slice(0, 12);
}

/**
 * Müşteriye verilecek adres.
 *
 * Görsel yoksa null. Zaten bir http(s) adresiyse dokunmuyoruz — ileride
 * görseller bir depolama servisine taşınırsa bu fonksiyon değişmeden çalışır.
 */
export function gorselAdresi(
  businessId: string,
  tur: GorselTuru,
  deger: string | null | undefined,
): string | null {
  if (!deger) return null;
  if (/^https?:\/\//i.test(deger)) return deger;
  if (!deger.startsWith("data:")) return null;
  return `/g/${businessId}/${tur}?s=${gorselSurumu(deger)}`;
}

/** data URI'yi ham baytlara ve içerik tipine ayırır. */
export function dataUrlCoz(
  deger: string,
): { tip: string; baytlar: Buffer } | null {
  // [\s\S] kullanıyoruz: `s` bayrağı bu derleme hedefinde yok.
  const eslesme = /^data:([\w/+.-]+);base64,([\s\S]+)$/.exec(deger.trim());
  if (!eslesme) return null;
  try {
    return { tip: eslesme[1], baytlar: Buffer.from(eslesme[2], "base64") };
  } catch {
    return null;
  }
}

/**
 * Duyuru/etkinlik afişinin adresi.
 *
 * Logo ve kapakla aynı gerekçe ve aynı desen: afişler de data URI olarak
 * saklanıyor ve Biyerlere keşfet listesine gömüldüklerinde tek mekanlık
 * bir yanıtı 164 KB'a çıkarıyorlardı. Adres yine içerik özetini taşıyor,
 * yani afiş değişince adres de değişiyor ve uzun önbellek güvenli kalıyor.
 */
export function duyuruGorselAdresi(
  duyuruId: string,
  deger: string | null | undefined,
): string | null {
  if (!deger) return null;
  if (/^https?:\/\//i.test(deger)) return deger;
  if (!deger.startsWith("data:")) return null;
  return `/g/duyuru/${duyuruId}?s=${gorselSurumu(deger)}`;
}
