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
 * Azami şifre uzunluğu — bir GÜVENLİK sınırı, biçim tercihi değil.
 *
 * bcrypt'in maliyeti girdiyle birlikte artıyor ve şifre alanı kimlik
 * doğrulaması GEREKTİRMEYEN bir uçta (giriş formu) okunuyordu. Sınırsızken
 * 1 MB'lık bir "şifre" tek istekte sunucuyu meşgul edebiliyordu; birkaç
 * eşzamanlı istek bunu hizmet dışı bırakmaya çeviriyor.
 *
 * 128 seçildi çünkü bcrypt zaten 72 baytın ötesini YOK SAYIYOR — yani bu
 * sınır hiçbir gerçek parolanın gücünü kesmiyor, parola yöneticisinin
 * ürettiği en uzun dizi bile rahatça altında kalıyor.
 *
 * Sınır burada, kuralın tek kaynağında: çağrı yerlerine tek tek eklemek,
 * eklenmeyen bir çağrı yerinin sessizce açık kalması demekti.
 */
export const MAX_SIFRE_UZUNLUK = 128;

/**
 * Şifrede sorun varsa Türkçe mesaj, yoksa null.
 *
 * Kasıtlı olarak sade: uzunluk ve "sadece rakam değil". Karmaşık kural
 * setleri (büyük harf/sembol zorunluluğu) kullanıcıyı tahmin edilebilir
 * kalıplara (Sifre1!) itiyor; asıl korumayı uzunluk sağlıyor.
 *
 * Karakter KISITI yok ve olmamalı: parola yöneticisinin ürettiği diziyi
 * reddetmek güvenliği düşürür. İki sınır da uzunluk üzerinden.
 */
export function sifreSorunu(sifre: string): string | null {
  if (sifre.length < MIN_SIFRE_UZUNLUK) {
    return `Şifre en az ${MIN_SIFRE_UZUNLUK} karakter olmalı.`;
  }
  if (sifre.length > MAX_SIFRE_UZUNLUK) {
    return `Şifre en fazla ${MAX_SIFRE_UZUNLUK} karakter olabilir.`;
  }
  if (/^\d+$/.test(sifre)) {
    return "Şifre sadece rakamlardan oluşmasın.";
  }
  return null;
}
