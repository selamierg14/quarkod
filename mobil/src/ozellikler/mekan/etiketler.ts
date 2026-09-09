/**
 * Mekan verisinin ekranda okunur hâle gelmesi.
 *
 * Kartlar ham alanları (`tur: "gece_kulubu"`, `ozellikler: ["canliMuzik"]`,
 * `mesafeMetre: 1240`) gösteremez. Bu çeviriler tek dosyada duruyor ki
 * "Balıkçı" bir ekranda "Balık restoran" olmasın — aynı mekan iki farklı
 * ekranda iki farklı isimle görününce kullanıcı bunu ayrı bir kategori
 * sanıyor.
 *
 * Anahtarlar sunucudaki lib/mekan.ts ve lib/constants.ts ile aynı; oradaki
 * liste büyürse burası da büyümeli. Tanımadığı anahtarda çökmüyor,
 * makul bir varsayılana düşüyor: eski bir uygulama sürümü yeni bir özellik
 * adı gördüğünde boş ekran değil, o rozeti atlamış bir kart göstersin.
 */

export const turAdlari: Record<string, string> = {
  yeme_icme: "Kafe & Restoran",
  balikci: "Balıkçı",
  gece_kulubu: "Gece kulübü",
};

/** Filtre çiplerinde kullanılan sıra — "Tümü" ekranın kendisinde ekleniyor. */
export const turSirasi = ["yeme_icme", "balikci", "gece_kulubu"] as const;

export const ozellikAdlari: Record<string, string> = {
  priz: "Priz",
  bahce: "Bahçe",
  petFriendly: "Evcil dostu",
  nargile: "Nargile",
  wifi: "Wi-Fi",
  otopark: "Otopark",
  canliMuzik: "Canlı müzik",
  macYayini: "Maç yayını",
};

export const ozellikSimgeleri: Record<string, string> = {
  priz: "🔌",
  bahce: "🌿",
  petFriendly: "🐾",
  nargile: "💨",
  wifi: "📶",
  otopark: "🅿️",
  canliMuzik: "🎸",
  macYayini: "📺",
};

/** Filtre çubuğunda öne çıkarılan özellikler — hepsini göstermek çubuğu şeride çeviriyordu. */
export const oneCikanOzellikler = ["bahce", "canliMuzik", "priz", "petFriendly"] as const;

/**
 * Rozet içindeki kısa ad.
 *
 * "Kafe & Restoran" 200 piksellik şerit kartının rozetinde kartın
 * neredeyse tamamını kaplıyordu; rozetin işi kategoriyi tam adıyla
 * yazmak değil, bir bakışta türü söylemek.
 */
export const turKisaAdlari: Record<string, string> = {
  yeme_icme: "Kafe",
  balikci: "Balıkçı",
  gece_kulubu: "Gece",
};

export function turAdi(tur: string): string {
  return turAdlari[tur] ?? "Mekan";
}

export function turKisaAdi(tur: string): string {
  return turKisaAdlari[tur] ?? "Mekan";
}

/**
 * Bütçe göstergesi.
 *
 * Fiyat aralığı yerine sembol: menü fiyatları sürekli değişiyor, sabit bir
 * aralık kısa sürede yalan olurdu (sunucudaki aynı gerekçe).
 */
export function fiyatIsareti(segment: string | null): string | null {
  if (segment === "ucuz") return "₺";
  if (segment === "orta") return "₺₺";
  if (segment === "pahali") return "₺₺₺";
  return null;
}

/**
 * Mesafe metni.
 *
 * Bir kilometrenin altında metre ("380 m"), üstünde tek ondalıklı
 * kilometre ("1,2 km"). "1200 m" teknik olarak doğru ama kimse mesafeyi
 * öyle düşünmüyor; "0,4 km" de aynı şekilde yanlış bir hassasiyet
 * izlenimi veriyor.
 */
export function mesafeMetni(metre: number | null): string | null {
  if (metre === null || !Number.isFinite(metre)) return null;
  if (metre < 1000) return `${Math.round(metre / 10) * 10} m`;
  return `${(metre / 1000).toFixed(1).replace(".", ",")} km`;
}

/** Puan metni — puanı olmayan mekanda "0.0" göstermek haksızlık olurdu. */
export function puanMetni(puan: number | null): string | null {
  return puan === null ? null : puan.toFixed(1);
}
