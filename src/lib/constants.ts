import packageJson from "../../package.json";

/** Uygulama sürümü — package.json ile senkron */
export const APP_VERSION = packageJson.version;

/** Rollerin panelde görünen adları. Tek yerde dursun ki ekranlar ayrışmasın. */
export const ROL_ADLARI: Record<string, string> = {
  superadmin: "Platform yöneticisi",
  owner: "Hesap sahibi",
  bolge: "Bölge müdürü",
  manager: "İşletme sorumlusu",
  viewer: "Salt okunur",
  garson: "Saha personeli",
};

/** İşletme türleri — kategori şablonlarının varsayılanını belirler. */
export const BUSINESS_TYPES = {
  yeme_icme: "Yeme-içme",
  balikci: "Balıkçı restoran",
  gece_kulubu: "Gece kulübü",
} as const;

export type BusinessType = keyof typeof BUSINESS_TYPES;

export const BUSINESS_TYPE_LIST = Object.entries(BUSINESS_TYPES).map(
  ([value, label]) => ({ value: value as BusinessType, label }),
);

/** Yeni işletme açılırken önerilen başlangıç kategorileri. */
export const DEFAULT_CATEGORIES: Record<BusinessType, string[]> = {
  yeme_icme: [
    "Yemek kalitesi",
    "Servis hızı",
    "Temizlik",
    "Fiyat/performans",
    "Personel ilgisi",
  ],
  balikci: [
    "Balığın tazeliği",
    "Servis kalitesi",
    "Fiyat/performans",
    "Temizlik",
    "Mekan/manzara",
  ],
  gece_kulubu: [
    "Müzik/DJ performansı",
    "Giriş/kapı süreci",
    "İçki servis hızı",
    "Atmosfer/dekor",
    "Güvenlik/personel tutumu",
  ],
};

/**
 * Basılan QR kartındaki çağrı metni.
 *
 * Kartın üstünde ne yazdığı, yazılımın tamamından daha çok etkiliyor okutulma
 * oranını: "Anket" diyen kart okutulmaz, karşılığı ve süresi belli olan bir
 * cümle okutulur. Bunlar başlangıç metni; işletme ayarlarından değiştirilebilir.
 */
export const DEFAULT_QR_CARD_TEXT: Record<BusinessType, string> = {
  yeme_icme: "Nasıl olduğunu söyleyin — 30 saniye sürer",
  balikci: "Sofranız nasıldı? 30 saniyede anlatın",
  gece_kulubu: "Gecen nasıl geçti? 30 saniyede söyle",
};

export function qrCardText(type: string, override?: string | null): string {
  if (override?.trim()) return override.trim();
  return (
    DEFAULT_QR_CARD_TEXT[type as BusinessType] ??
    "Görüşünüzü paylaşın — 30 saniye sürer"
  );
}

export const FEEDBACK_STATUSES = {
  yeni: "Yeni",
  incelendi: "İncelendi",
  cozuldu: "Çözüldü",
} as const;

export type FeedbackStatus = keyof typeof FEEDBACK_STATUSES;

export const FEEDBACK_STATUS_LIST = Object.entries(FEEDBACK_STATUSES).map(
  ([value, label]) => ({ value: value as FeedbackStatus, label }),
);

export const SHIFTS = {
  sabah: "Sabah",
  aksam: "Akşam",
  gece: "Gece",
} as const;

export type Shift = keyof typeof SHIFTS;

/** Saatten vardiya çıkarımı — P1 "vardiya etiketleme" için temel. */
export function shiftFromDate(date: Date): Shift {
  const hour = date.getHours();
  if (hour >= 6 && hour < 16) return "sabah";
  if (hour >= 16 && hour < 23) return "aksam";
  return "gece";
}

/**
 * QR'ların ve e-postadaki bağlantıların gösterdiği kök adres.
 *
 * Baskıya giden QR bu adresi taşır; yanlış olursa masadaki kart çöp olur.
 * Bu yüzden tek yerden okunuyor ve QR ekranı localhost'ta uyarı gösteriyor.
 */
export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}
