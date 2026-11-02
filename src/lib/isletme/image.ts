/**
 * Görsel doğrulama sabitleri ve sunucu tarafı kontrolü.
 *
 * Görseller data URI olarak veritabanında saklanıyor (dış depolama servisi
 * yok). Bu yüzden boyut sınırı kritik: küçültme tarayıcıda yapılıyor ama
 * sunucu buna güvenemez — kötü niyetli bir istek devasa bir dize gönderebilir.
 */

/**
 * Kullanıcının seçebileceği ham dosyanın en büyük boyutu — küçültmeden önce.
 *
 * Telefon kamerası tek bir fotoğrafı 15-30 MB'a kadar üretebiliyor; bunu
 * doğrudan canvas'a çizmeye çalışmak (özellikle mobil Safari'de) tarayıcıyı
 * dondurabilir ya da bellek hatası verebilir. Bu yüzden işlemeye kalkışmadan
 * önce, tüm görsel alanlarında (logo, kapak, ürün, anket kanıtı) ortak bir
 * üst sınır uygulanıyor.
 */
export const MAX_RAW_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

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
/// Duyuru/etkinlik görseli (ör. hafta sonu sanatçı afişi). Kapak kadar
/// geniş olabiliyor ama duyurular listesi birden fazla kayıt taşıyabildiği
/// için biraz daha dar tutuldu.
export const MAX_DUYURU_BYTES = 450 * 1024; // ~450 KB

/** Tarayıcıda küçültme hedefleri. */
export const LOGO_MAX_DIM = 400;
export const COVER_MAX_WIDTH = 1200;
export const MENU_MAX_DIM = 800;
export const ANKET_MAX_DIM = 1000;
export const DUYURU_MAX_WIDTH = 1000;

const ALLOWED_PREFIX = /^data:image\/(png|jpeg|webp);base64,/;

export type ImageKind = "logo" | "cover" | "menu" | "anket" | "duyuru";

type GorselTuru = "png" | "jpeg" | "webp";

/**
 * Dosyanın ilk baytları beyan edilen türün imzası mı.
 *
 *   PNG   89 50 4E 47 0D 0A 1A 0A
 *   JPEG  FF D8 FF
 *   WebP  "RIFF" ???? "WEBP"
 *
 * Yalnızca ilk 16 bayt çözülüyor (24 base64 karakteri) — 450 KB'lık bir
 * görselin tamamını imza için belleğe açmaya gerek yok.
 */
export function imzaUyuyorMu(tur: GorselTuru, base64: string): boolean {
  let bas: Buffer;
  try {
    bas = Buffer.from(base64.slice(0, 24), "base64");
  } catch {
    return false;
  }
  const esit = (konum: number, baytlar: number[]) =>
    baytlar.every((b, i) => bas[konum + i] === b);
  switch (tur) {
    case "png":
      return esit(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "jpeg":
      return esit(0, [0xff, 0xd8, 0xff]);
    case "webp":
      return esit(0, [0x52, 0x49, 0x46, 0x46]) && esit(8, [0x57, 0x45, 0x42, 0x50]);
  }
}

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

  // Önek bir BEYAN, kanıt değil: istek elle kurulup "data:image/png" diye
  // etiketlenmiş bir GIF ya da başka bir dosya gönderilebiliyordu (QA bir
  // GIF'in yüklenip önizlendiğini gördü). Dosyanın ilk baytlarındaki imza
  // beyan edilen türle eşleşmeli.
  const beyan = ALLOWED_PREFIX.exec(value)![1] as GorselTuru;
  if (!imzaUyuyorMu(beyan, base64)) {
    return "Görsel biçimi tanınmadı. PNG, JPEG veya WebP yükleyin.";
  }
  const bytes = Math.floor((base64.length * 3) / 4);
  const limit =
    kind === "logo"
      ? MAX_LOGO_BYTES
      : kind === "menu"
        ? MAX_MENU_BYTES
        : kind === "anket"
          ? MAX_ANKET_BYTES
          : kind === "duyuru"
            ? MAX_DUYURU_BYTES
            : MAX_COVER_BYTES;

  if (bytes > limit) {
    const kb = Math.round(limit / 1024);
    return `Görsel çok büyük (en fazla ~${kb} KB). Daha küçük bir görsel deneyin.`;
  }

  return null;
}

/** Data URI'den çözülmüş görsel: ham baytlar ve MIME türü. */
export type CozulmusGorsel = { baytlar: Buffer; tur: string };

/**
 * Data URI'yi gerçek baytlara çevirir.
 *
 * Biyerlere mobil API'si için gerekli: görseller veritabanında data URI
 * olarak duruyor ve bunları JSON listesine gömmek yanıtı şişiriyordu —
 * tek mekanlı bir liste 164 KB'a çıkıyor, elli mekanlı bir keşfet ekranı
 * mobil veriyle açılamaz hale geliyordu. Artık liste yalnızca adresi
 * veriyor, baytları bu çözümleme üzerinden ayrı bir uç sunuyor; böylece
 * görseller tembel yükleniyor ve HTTP önbelleğine giriyor.
 *
 * Yalnızca izin verilen MIME türleri kabul ediliyor: veritabanındaki bir
 * değer bir şekilde bozulmuşsa tarayıcıya rastgele bir içerik türü
 * sunmuyoruz.
 */
export function dataUriCoz(deger: string | null | undefined): CozulmusGorsel | null {
  if (!deger) return null;
  const eslesme = deger.match(/^data:(image\/(?:png|jpeg|webp));base64,([\s\S]+)$/);
  if (!eslesme) return null;

  try {
    return { tur: eslesme[1], baytlar: Buffer.from(eslesme[2], "base64") };
  } catch {
    return null;
  }
}
