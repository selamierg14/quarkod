import type { AnketHunisi } from "./stats";

/**
 * Huni yüzdeleri ve basamak arası kayıp.
 *
 * Görüntüleme 0 olduğunda (yeni açılmış, henüz hiç QR okutulmamış işletme)
 * bölme hatası yerine hepsi null dönüyor — sayfa "%0" gibi yanıltıcı bir
 * rakam göstermek yerine "veri yok" diyebilsin diye.
 */
export type HuniYuzdeleri = {
  yildizOrani: number | null;
  gonderimOrani: number | null;
  /** Yıldız verip göndermeyenlerin oranı — anketin "geri kalanı" ne kadar kaybettiriyor. */
  terkOrani: number | null;
};

export function huniYuzdeleriHesapla(h: AnketHunisi): HuniYuzdeleri {
  if (h.goruntuleme === 0) {
    return { yildizOrani: null, gonderimOrani: null, terkOrani: null };
  }
  const yildizOrani = (h.yildizVerdi / h.goruntuleme) * 100;
  const gonderimOrani = (h.gonderildi / h.goruntuleme) * 100;
  const terkOrani =
    h.yildizVerdi === 0 ? null : ((h.yildizVerdi - h.gonderildi) / h.yildizVerdi) * 100;
  return { yildizOrani, gonderimOrani, terkOrani };
}
