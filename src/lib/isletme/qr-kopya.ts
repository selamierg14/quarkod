/**
 * ORTAK (GİRİŞ) QR'IN ÇOĞALTILMASI — matbaa için.
 *
 * Masa QR'ları benzersiz: her biri kendi masasını işaret ediyor ve
 * çoğaltılmaları anlamsız. Giriş QR'ı ise tam tersi — mekanda TEK bir
 * adresi gösteriyor ama fiziksel olarak birden çok yere asılıyor:
 * kapıya, kasaya, masalara, menünün arkasına.
 *
 * Şimdiye kadar baskı çıktısında bir tane vardı; matbaaya "şunu 30 kez
 * basın" demek gerekiyordu ve bu, dosyayı alan kişinin elle yapacağı
 * (ve yanlış yapabileceği) bir iş olarak kalıyordu.
 *
 * ÇOĞALTILAN KOPYALARIN HEPSİ AYNI QR. Yeni masa/yeni token üretilmiyor:
 * amaç aynı adresin birden fazla fiziksel kopyası. Ayrı token üretmek
 * ziyaret ve anket istatistiklerini bölerdi.
 */

/** Tek seferde basılabilecek en fazla kopya. */
export const EN_COK_KOPYA = 100;

/**
 * 100'de duruyor çünkü her kopya sunucuda ayrı bir QR görüntüsü ve
 * PDF'te ayrı bir sayfa demek; sınırsız bırakmak, adres çubuğuna
 * "?kopya=100000" yazan birine sunucuyu kilitletirdi.
 */
export function kopyaCoz(ham: string | number | undefined | null): number {
  const sayi = typeof ham === "number" ? ham : Number(String(ham ?? "").trim());
  if (!Number.isFinite(sayi)) return 1;
  return Math.min(EN_COK_KOPYA, Math.max(1, Math.floor(sayi)));
}

export type QrKart<T> = T & {
  /** Giriş (ortak) QR'ı mı — yalnızca bu çoğaltılıyor. */
  girisMi: boolean;
};

/**
 * Giriş kartını `kopya` kadar tekrarlar, masa kartlarına dokunmaz.
 *
 * Sıra korunuyor: giriş kartları listenin neredeyse başında (masaSirala
 * onları öne alıyor) ve kopyalar yan yana çıkıyor, matbaacı sayfayı
 * bölerken aynı kartların bir arada olduğunu görüyor.
 *
 * `etiketle` kopya numarasını etikete ekleyen isteğe bağlı bir kanca:
 * ekranda "Giriş (2/30)" yazmak, kullanıcının kaç kopya ürettiğini
 * görmesini sağlıyor. PDF'te kullanılmıyor — basılan kartın üstünde
 * "2/30" yazması, aynı olmaları gereken kartları farklı gösterirdi.
 */
export function kopyalariYay<T>(
  kartlar: QrKart<T>[],
  kopya: number,
  etiketle?: (kart: QrKart<T>, sira: number, toplam: number) => QrKart<T>,
): QrKart<T>[] {
  const adet = kopyaCoz(kopya);
  if (adet <= 1) return kartlar;

  return kartlar.flatMap((kart) => {
    if (!kart.girisMi) return [kart];
    return Array.from({ length: adet }, (_, i) =>
      etiketle ? etiketle(kart, i + 1, adet) : kart,
    );
  });
}

/** Çoğaltılabilecek bir giriş kartı var mı — arayüz kutuyu ona göre çiziyor. */
export function girisKartiVarMi<T>(kartlar: QrKart<T>[]): boolean {
  return kartlar.some((k) => k.girisMi);
}
