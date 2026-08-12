/**
 * Görsel doğrulama sabitleri ve sunucu tarafı kontrolü.
 *
 * Görseller data URI olarak veritabanında saklanıyor (dış depolama servisi
 * yok). Bu yüzden boyut sınırı kritik: küçültme tarayıcıda yapılıyor ama
 * sunucu buna güvenemez — kötü niyetli bir istek devasa bir dize gönderebilir.
 */

/** Data URI olarak izin verilen en büyük boyut (yaklaşık; base64 şişmesi dahil). */
export const MAX_LOGO_BYTES = 200 * 1024; // ~200 KB
export const MAX_COVER_BYTES = 600 * 1024; // ~600 KB
/// Menü ürün fotoğrafı. Bir menüde onlarca ürün olabildiği için sınır dar
/// tutuldu: sayfa müşterinin mobil veriyle açılıyor.
export const MAX_MENU_BYTES = 250 * 1024; // ~250 KB
/// Müşterinin ankete eklediği kanıt fotoğrafı. Menü fotoğrafından biraz
/// geniş: burada amaç iştah açmak değil, "sorun buydu" demek — detay
/// okunabilmeli.
export const MAX_ANKET_BYTES = 400 * 1024; // ~400 KB

/** Tarayıcıda küçültme hedefleri. */
export const LOGO_MAX_DIM = 400;
export const COVER_MAX_WIDTH = 1200;
export const MENU_MAX_DIM = 800;
export const ANKET_MAX_DIM = 1000;

const ALLOWED_PREFIX = /^data:image\/(png|jpeg|webp);base64,/;

export type ImageKind = "logo" | "cover" | "menu" | "anket";

/**
 * Bir data URI'nin güvenli biçimde saklanabileceğini doğrular.
 * Geçerliyse null, değilse Türkçe hata mesajı döner.
 */
export function validateImageDataUrl(
  value: string,
  kind: ImageKind,
): string | null {
  if (!ALLOWED_PREFIX.test(value)) {
    return "Görsel biçimi tanınmadı. PNG, JPEG veya WebP yükleyin.";
  }

  // base64 uzunluğundan yaklaşık bayt sayısı.
  const base64 = value.slice(value.indexOf(",") + 1);
  const bytes = Math.floor((base64.length * 3) / 4);
  const limit =
    kind === "logo"
      ? MAX_LOGO_BYTES
      : kind === "menu"
        ? MAX_MENU_BYTES
        : kind === "anket"
          ? MAX_ANKET_BYTES
          : MAX_COVER_BYTES;

  if (bytes > limit) {
    const kb = Math.round(limit / 1024);
    return `Görsel çok büyük (en fazla ~${kb} KB). Daha küçük bir görsel deneyin.`;
  }

  return null;
}
