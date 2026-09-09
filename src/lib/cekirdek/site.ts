/**
 * Pazarlama sitesinin sabitleri.
 *
 * Alan adı, marka adı ve iletişim bilgisi üç ayrı yerde (metadata, sitemap,
 * yapısal veri) gerekiyor; birinde eski adres kalırsa Google yanlış adresi
 * indeksler. Tek kaynak burası.
 */

export const SITE_ADI = "Quarkod";

export const SITE_ACIKLAMA =
  "Masaya koyduğunuz QR kod ile müşteri memnuniyetini ölçün, düşük puanı anında haber alın, yüksek puanı Google yorumuna yönlendirin.";

/**
 * Sitenin kanonik adresi.
 *
 * QR kodlarındaki adresle aynı değişkenden besleniyor: ikisi ayrışırsa
 * basılı kartlar bir alan adını, arama motoru başka birini gösterir.
 */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Sticky arama düğmesi için telefon. Tanımlı değilse düğme telefon yerine
 * denemeye götürür — çalışmayan bir numarayı göstermektense.
 */
export function iletisimTelefonu(): string | null {
  const ham = (process.env.NEXT_PUBLIC_ILETISIM_TEL ?? "").trim();
  return ham || null;
}

/** tel: bağlantısı için boşluksuz hâli. */
export function telefonHref(numara: string): string {
  return `tel:${numara.replace(/[^\d+]/g, "")}`;
}

export const ILETISIM_EPOSTA = process.env.NEXT_PUBLIC_ILETISIM_EPOSTA?.trim() || null;
