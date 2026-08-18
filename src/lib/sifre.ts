/**
 * Şifre kuralının tek kaynağı.
 *
 * Aynı kural beş ayrı yerde (self-servis deneme, şifre sıfırlama, hesap
 * açılışında sahip, işletme açılışında sorumlu, panelden kullanıcı ekleme)
 * elle yazılmıştı ve dördü "yalnızca rakam" kontrolünü atlıyordu: deneme
 * formundan "12345678" ile hesap açılabiliyor ama sonra panelden aynı şifre
 * reddediliyordu. Kural buraya alınınca hem tutarlı hem test edilebilir oldu.
 */

export const MIN_SIFRE_UZUNLUK = 8;

/**
 * Şifrede sorun varsa Türkçe mesaj, yoksa null.
 *
 * Kasıtlı olarak sade: uzunluk ve "sadece rakam değil". Karmaşık kural
 * setleri (büyük harf/sembol zorunluluğu) kullanıcıyı tahmin edilebilir
 * kalıplara (Sifre1!) itiyor; asıl korumayı uzunluk sağlıyor.
 */
export function sifreSorunu(sifre: string): string | null {
  if (sifre.length < MIN_SIFRE_UZUNLUK) {
    return `Şifre en az ${MIN_SIFRE_UZUNLUK} karakter olmalı.`;
  }
  if (/^\d+$/.test(sifre)) {
    return "Şifre sadece rakamlardan oluşmasın.";
  }
  return null;
}
