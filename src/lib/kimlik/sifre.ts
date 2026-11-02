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

/**
 * YENİ şifre belirlenirken uygulanan kuralın tamamı: iki kutunun
 * eşleşmesi + biçim.
 *
 * Şifre dört ayrı yerde belirleniyor (panel içi değiştirme, panel şifre
 * sıfırlama, tüketici içi değiştirme, tüketici şifre kurtarma) ve dördü de
 * aynı iki kontrolü yapmak zorunda. Ayrı ayrı yazıldığında sıraları bile
 * tutmuyordu: biri önce eşleşmeye, biri önce uzunluğa bakıyordu — aynı
 * hatalı girdi ekrana farklı mesaj döndürüyordu.
 *
 * SIRA ÖNEMLİ ve burada sabit: önce EŞLEŞME. "Şifre en az 8 karakter
 * olmalı" deyip kullanıcının düzelttiği, sonra "şifreler uyuşmuyor"
 * deyip bir kez daha geri gönderdiği akış iki tur sürüyordu. Eşleşme
 * hatası kullanıcının gözüyle daha bariz; onu önce söylemek daha az tur
 * demek.
 *
 * Tekrar kutusu SUNUCUDA da kontrol ediliyor, yalnızca tarayıcıda değil:
 * tarayıcı kontrolü bir kolaylık, istek elle de kurulabilir. Buradaki
 * kontrol kullanıcıyı yazım hatasından koruyor — güvenlik sınırı değil,
 * ama sunucuda olmadığında hiçbir şey değil.
 */
export function yeniSifreSorunu(sifre: string, tekrar: string): string | null {
  if (sifre !== tekrar) return "Şifreler birbiriyle uyuşmuyor.";
  return sifreSorunu(sifre);
}
