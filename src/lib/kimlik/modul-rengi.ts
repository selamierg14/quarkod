/**
 * Panel yüzeylerinin renk tonu — tek kaynak.
 *
 * ÖNCE: her modül kendi rengini taşıyordu (indigo, gök mavisi, zümrüt,
 * amber, gül, menekşe, camgöbeği). Amaç "neredeyim" duygusuydu; sonuç UI
 * incelemesinin (Ekim 2026) deyişiyle "anlamsız bir renk gökkuşağı" oldu:
 * aynı ekranda beş renkli kart başlığı yan yana geliyor, renk hiçbir şey
 * anlatmıyor, kırmızı hata olmayan yerlerde (Şifre değiştir, İzin &
 * müsaitlik, Masaya göre) beliriyordu. Konum bilgisini artık kenar
 * çubuğundaki aktif satır ve üst çubuktaki konum yolu veriyor.
 *
 * ŞİMDİ: tek vurgu tonu. Renk yalnızca DURUM anlatıyor (başarı, uyarı,
 * tehlike — Badge/StatusBadge/Alert); yüzeyler nötr, ikon rozetleri
 * markanın tek tonunda. `ModulRengi` adı ve `renk` parametreleri çağıranlar
 * bozulmasın diye duruyor; değer artık görünümü değiştirmiyor.
 *
 * Tailwind sınıfları derleme anında kaynak taranarak toplanır: sınıf
 * adları tam ve sabit yazılmalı.
 */

export type ModulRengi =
  | "indigo"
  | "sky"
  | "emerald"
  | "amber"
  | "rose"
  | "violet"
  | "teal"
  | "slate";

export type ModulTonu = {
  /** İkon rozeti — sayfa ve bölüm başlıklarında aynı yumuşak vurgu. */
  rozet: string;
  /** Bölüm başlığı şeridi: nötr yüzey + ayırıcı çizgi. */
  serit: string;
  /** Kart üstündeki renk çizgisi — artık çizilmiyor (boş). */
  cizgi: string;
  /** Başlık arkasındaki parıltı — artık yok (boş). */
  parilti: string;
  /** Metin vurgusu (rakam, aktif sekme). */
  metin: string;
};

const TEK_TON: ModulTonu = {
  rozet: "bg-accent-50 text-accent-700 ring-1 ring-inset ring-accent-100",
  serit: "border-line bg-surface",
  cizgi: "",
  parilti: "",
  metin: "text-accent-700",
};

/** `renk` artık görünümü değiştirmiyor; imza çağıranlar için korunuyor. */
export function modulTonu(renk?: ModulRengi): ModulTonu {
  void renk;
  return TEK_TON;
}
