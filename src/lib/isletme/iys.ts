/**
 * İYS (İleti Yönetim Sistemi) uyumu.
 *
 * 6563 sayılı kanun gereği ticari elektronik ileti izinleri İYS'ye bildirilir.
 * Buradaki sözlük bilerek İYS API'sinin alan adlarını birebir izler
 * (recipient / type / recipientType / status / source / consentDate) — çeviri
 * katmanı koymak, dışa aktarımda sessiz hata üretmenin en kolay yolu olurdu.
 *
 * Tekil izin ekleme uç noktası:
 *   POST /sps/{iysCode}/brands/{brandCode}/consents
 *
 * ÖNEMLİ: Bu izin, ankette alınan KVKK rızasından ayrıdır. KVKK rızası yalnızca
 * ilgili geri bildirime dönüş içindir ve 90 günde silinir; buradaki izin ticari
 * ileti göndermek içindir ve ayrı bir kutuyla, ayrı bir metinle alınır.
 */

/** İYS "type" — iletişim kanalı. */
export const IYS_CHANNELS = {
  MESAJ: "SMS",
  EPOSTA: "E-posta",
  ARAMA: "Arama",
} as const;

export type IysChannel = keyof typeof IYS_CHANNELS;

/** İYS "status". RET bağlayıcıdır: ret verilmiş adrese ileti gönderilemez. */
export const IYS_STATUSES = {
  ONAY: "Onay",
  RET: "Ret",
} as const;

export type IysStatus = keyof typeof IYS_STATUSES;

/** İYS "recipientType". */
export const IYS_RECIPIENT_TYPES = {
  BIREYSEL: "Bireysel",
  TACIR: "Tacir",
} as const;

export type IysRecipientType = keyof typeof IYS_RECIPIENT_TYPES;

/**
 * İYS "source" — iznin nereden alındığı.
 *
 * Bizim akışımız masadaki karekodla açılan bir web sayfası olduğu için
 * varsayılan HS_WEB. Mobil uygulamaya taşınırsa HS_MOBIL'e çevrilmeli.
 */
export const IYS_SOURCES = {
  HS_WEB: "Web sitesi",
  HS_MOBIL: "Mobil",
  HS_FIZIKSEL_ORTAM: "Fiziksel ortam",
  HS_ISLAK_IMZA: "Islak imza",
  HS_CAGRI_MERKEZI: "Çağrı merkezi",
  HS_SOSYAL_MEDYA: "Sosyal medya",
  HS_EPOSTA: "E-posta",
  HS_MESAJ: "Mesaj",
  HS_EORTAM: "Elektronik ortam",
  HS_ETKINLIK: "Etkinlik",
  HS_ATM: "ATM",
} as const;

export type IysSource = keyof typeof IYS_SOURCES;

export const DEFAULT_IYS_SOURCE: IysSource = "HS_WEB";

/**
 * Onay metninin sürümü. Metin değişirse artırın.
 *
 * Sürüm tek başına yetmez; onaylanan cümlenin tam kopyası da kayda yazılır
 * (MarketingConsent.consentText). Metin aynı sürümle değiştirilirse hangi
 * cümlenin kabul edildiği ancak o kopyadan ispatlanabilir.
 */
export const MARKETING_TEXT_VERSION = "ticari-2026-08-v2";

/**
 * Ankette gösterilen ticari ileti onayı cümlesi.
 *
 * Mevzuat açık ileti metninde iki şeyin net yazmasını istiyor: iletinin hangi
 * KANALLA gönderileceği ve hangi MARKA adına yapılacağı. Bu yüzden metin
 * müşterinin bıraktığı iletişim kanalına göre değişir — "SMS ve e-posta"
 * gibi toplu bir ifade, aslında yalnızca telefon veren birinden e-posta
 * onayı da almış gibi görünmek olurdu.
 */
export function marketingConsentText(
  businessName: string,
  contactType: "telefon" | "eposta",
): string {
  const kanal = contactType === "telefon" ? "SMS" : "e-posta";
  return (
    `${businessName} markası adına, bıraktığım iletişim adresine ${kanal} ` +
    `yoluyla kampanya, indirim ve duyuru içeren ticari elektronik ileti ` +
    `gönderilmesine izin veriyorum. Bu izni dilediğim zaman ücretsiz olarak ` +
    `geri alabilirim.`
  );
}

/**
 * Telefonu İYS'nin beklediği biçime çevirir: +905XXXXXXXXX.
 *
 * Türkiye'de numara "0532...", "532...", "+90532..." gibi çok biçimde yazılır;
 * İYS tek biçim kabul eder. Çevrilemeyen numara için null döner — hatalı kayıt
 * göndermektense hiç göndermemek doğrusu.
 */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");

  // 905XXXXXXXXX (12) | 05XXXXXXXXX (11) | 5XXXXXXXXX (10)
  let local: string | null = null;
  if (digits.length === 12 && digits.startsWith("90")) local = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) local = digits.slice(1);
  else if (digits.length === 10) local = digits;

  if (!local || !local.startsWith("5")) return null;
  return `+90${local}`;
}

/** E-postayı normalleştirir; geçersizse null. */
export function normalizeEmail(raw: string): string | null {
  const value = raw.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
}

/** İletişim tipine göre kanal ve İYS biçiminde alıcı. */
export function toRecipient(
  contactType: "telefon" | "eposta",
  raw: string,
): { channel: IysChannel; recipient: string } | null {
  if (contactType === "telefon") {
    const phone = normalizePhone(raw);
    // Telefon için MESAJ (SMS) izni alıyoruz; ARAMA ayrı bir izindir ve
    // ayrıca sorulmadan varsayılamaz.
    return phone ? { channel: "MESAJ", recipient: phone } : null;
  }

  const email = normalizeEmail(raw);
  return email ? { channel: "EPOSTA", recipient: email } : null;
}

/** İYS "consentDate" biçimi: YYYY-MM-DD HH:mm:ss (yerel saat). */
export function formatConsentDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

export type IysConsentPayload = {
  consentDate: string;
  source: string;
  recipient: string;
  recipientType: string;
  status: string;
  type: string;
};

/** Tek bir izni İYS API'sinin beklediği gövdeye çevirir. */
export function toIysPayload(consent: {
  recipient: string;
  channel: string;
  recipientType: string;
  status: string;
  source: string;
  consentAt: Date;
}): IysConsentPayload {
  return {
    consentDate: formatConsentDate(consent.consentAt),
    source: consent.source,
    recipient: consent.recipient,
    recipientType: consent.recipientType,
    status: consent.status,
    type: consent.channel,
  };
}

/** Toplu yüklemede kullanılan sütun başlıkları (İYS alan adlarıyla birebir). */
export const IYS_EXPORT_HEADERS = [
  "recipient",
  "type",
  "recipientType",
  "status",
  "consentDate",
  "source",
] as const;
