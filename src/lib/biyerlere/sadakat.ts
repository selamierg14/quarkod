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

/**
 * Bu mekan için AÇILMASI GEREKEN ama henüz açılmamış sadakat kuponu var mı?
 *
 * Kupon üretimi eskiden "eşik tam bu ziyarette geçildi mi" anlık koşuluna
 * bağlıydı ve yazma işlemi ziyaret işleminin dışındaydı. Kupon yazımı
 * herhangi bir sebeple düşerse (bağlantı kopması, zaman aşımı) kullanıcı
 * on ziyareti tamamlamış ama kuponsuz kalıyordu — üstelik TELAFİSİ YOKTU:
 * bir sonraki ziyarette sayı 11 olup `11 % 10 = 1` veriyor ve eşik koşulu
 * bir daha asla sağlanmıyordu.
 *
 * "Hak edilen kadar kupon açılmış mı" sorusu hem tekrarlanabilir
 * (idempotent) hem de kendini onarır: kaçan kupon bir sonraki ziyarette
 * açılır.
 */
export function acilmasiGerekenKuponVarMi(
  toplamZiyaret: number,
  acilmisKupon: number,
  esik: number = SADAKAT_ESIGI,
): boolean {
  const guvenliToplam = Math.max(0, Math.trunc(toplamZiyaret));
  const guvenliKupon = Math.max(0, Math.trunc(acilmisKupon));
  return Math.floor(guvenliToplam / esik) > guvenliKupon;
}
