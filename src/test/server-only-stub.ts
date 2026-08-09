/**
 * Testlerde "server-only" yerine yüklenen boş modül.
 *
 * Gerçek paket Next dışında import edilince hata fırlatıyor; sunucu tarafı
 * saf yardımcıları (SMS numarası biçimi, OTP maskeleme) test edebilmek için
 * yalnızca test ortamında bununla değiştiriliyor. Üretim derlemesi gerçek
 * paketi kullanmaya devam eder.
 */
export {};
