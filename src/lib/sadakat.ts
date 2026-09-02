/**
 * Kahve sadakat damga kartı.
 *
 * Yeni bir tablo açmadan AppVisit'in kendisinden türetiliyor: doğrulanmış
 * ziyaret zaten "kişi gerçekten bu mekandaydı" iddiasını taşıyor (bkz.
 * lib/ziyaret.ts), damga da aynı iddiayı sayıyor — ikinci bir kayıt
 * mekanizması aynı bilgiyi iki yerde tutmak, biri güncellenip diğeri
 * unutulduğunda tutarsızlık demek olurdu.
 *
 * Saf tutuldu: "kaçıncı ziyarette hediye kazanılır" sorusu veritabanından
 * bağımsız test edilebilsin.
 */

/** Kaç doğrulanmış ziyarette bir ücretsiz kahve hakkı doğar. */
export const SADAKAT_ESIGI = 10;

export type SadakatDurumu = {
  /** O mekandaki toplam doğrulanmış ziyaret. */
  toplamZiyaret: number;
  /** Mevcut turda dolu damga sayısı (0'dan eşiğe kadar döner). */
  damgaSayisi: number;
  esik: number;
  /** Bir sonraki hediyeye kalan ziyaret sayısı. */
  kalanZiyaret: number;
  /**
   * Bu ziyaretle TAM eşiğe ulaşıldı mı — yalnızca "hediye kazandın" anını
   * bir kez göstermek için (ziyaret sayısı sorgulanınca her seferinde
   * "kazandın" denmesin, yalnızca eşiği yeni geçen ziyarette).
   */
  hediyeKazanildiMi: boolean;
};

export function sadakatDurumuHesapla(
  toplamZiyaret: number,
  esik: number = SADAKAT_ESIGI,
): SadakatDurumu {
  const guvenliToplam = Math.max(0, Math.trunc(toplamZiyaret));
  const damgaSayisi = guvenliToplam % esik;

  return {
    toplamZiyaret: guvenliToplam,
    damgaSayisi,
    esik,
    kalanZiyaret: damgaSayisi === 0 ? esik : esik - damgaSayisi,
    hediyeKazanildiMi: guvenliToplam > 0 && damgaSayisi === 0,
  };
}
