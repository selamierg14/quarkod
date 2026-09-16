import type { BildirimOgesi } from "../api/tipler";

/**
 * Zil rozetindeki sayı — son bakıştan sonra düşen öğeler.
 *
 * Store'dan (bildirimler.ts) AYRI bir dosyada çünkü orası `api/istemci`
 * üzerinden `react-native`e bağlı ve test ortamında (node) yüklenemiyor.
 * Saf kuralın testlenebilir olması, onu bir modül sınırıyla ayırmaya
 * değer: rozet hesabı yanlış olursa ya hiç sönmüyor (kullanıcı bakmayı
 * bırakıyor) ya hiç yanmıyor (bildirim merkezi görünmez oluyor).
 */
export function yeniBildirimSayisi(
  ogeler: BildirimOgesi[] | null,
  sonGorulme: string | null,
): number {
  if (!ogeler) return 0;
  if (!sonGorulme) return ogeler.length;
  // ISO tarihleri sözlük sırasında da kronolojik: ayrıştırmaya gerek yok.
  return ogeler.filter((o) => o.tarih > sonGorulme).length;
}
