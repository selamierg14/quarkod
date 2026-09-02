/**
 * Bildirim zilindeki rozet sayısı için "en son ne zaman baktı" izi.
 *
 * Sunucuda "okundu" durumu tutulmuyor (bkz. api/app/bildirimler/route.ts) —
 * bu tamamen istemci tarafı bir kolaylık: `/bildirimler` sayfası açıldığında
 * "şu ana kadarki her şeyi gördün" damgası basılıyor, zil de bundan SONRAKİ
 * öğeleri sayıyor. localStorage cihaza özel olduğu için farklı cihazdan
 * girişte zil yeniden dolu görünür — bu bir hata değil, aynı davranışı
 * panelin okundu/okunmadı sistemleri de paylaşmıyor zaten burada.
 */
const ANAHTAR = "biyerlere_bildirim_son_gorulme";

export function bildirimSonGorulmeOku(): string | null {
  try {
    return localStorage.getItem(ANAHTAR);
  } catch {
    return null;
  }
}

export function bildirimSonGorulmeYaz(tarihIso: string): void {
  try {
    localStorage.setItem(ANAHTAR, tarihIso);
  } catch {
    // Depolama kapalı olabilir (gizli sekme vb.) — sessizce geç.
  }
}
