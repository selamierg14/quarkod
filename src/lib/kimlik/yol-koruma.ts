/**
 * "Hangi yol hangi kapıdan geçer" kararı — saf ve testli.
 *
 * Bu dosyanın varlık sebebi üretimi kıran bir hata: middleware'in matcher'ı
 * hem `/admin/:path*` hem `/api/app/:path*` yollarını yakalıyor, ama gövdede
 * `/api/app/*` için YALNIZCA geliştirme ortamında bir dal vardı (CORS). O dal
 * `development` ile sınırlı olduğu için ÜRETİMDE istek aşağıya, panelin çerez
 * kapısına düşüyordu:
 *
 *     /api/app/mekanlar → çerez yok → 307 redirect /admin/giris
 *
 * Yani üretimde mobil uygulamanın ve Biyerlere web'in TAMAMI çalışmayacaktı;
 * geliştirmede erken `return` sayesinde hata hiç görünmüyordu — ortama bağlı,
 * en sinsi hata türü.
 *
 * Karar bir dizi `if`ten çıkarılıp saf bir fonksiyona alındı ki test
 * edilebilsin: middleware'i gerçek bir `NextRequest` olmadan sınamak zor,
 * bir dize alıp karar döndüren fonksiyonu sınamak kolay.
 */

export type YolKarari =
  /** Tüketici API'si: kimliğini kendi doğrular (Bearer jeton). */
  | { tur: "appApi"; corsGerekli: boolean }
  /** Panel giriş sayfası — oturum aranmaz, yoksa döngüye girer. */
  | { tur: "serbest" }
  /** Panel: geçerli oturum çerezi şart. */
  | { tur: "oturumGerekli" };

/**
 * Yolun hangi koruma sınıfına girdiği.
 *
 * `gelistirme` bayrağı dışarıdan veriliyor: `process.env` okuyan bir
 * fonksiyon testte ortam değişkeni kurcalamayı gerektirirdi ve tam da bu
 * hatanın kaynağı ortama bağlı davranıştı.
 */
export function yolKarari(pathname: string, gelistirme: boolean): YolKarari {
  // Tüketici API'si panelin çerez oturumunu HİÇ kullanmıyor; jetonu
  // `Authorization` başlığında taşıyor ve her rota kendi kapısını
  // (appKullaniciGerekli) işletiyor. Bu yüzden burada asla çerez aranmaz —
  // ortamdan bağımsız olarak.
  if (pathname === "/api/app" || pathname.startsWith("/api/app/")) {
    // CORS başlıkları yalnızca geliştirmede: native uygulamada CORS diye bir
    // şey yok, yalnızca Expo'nun web önizlemesi (localhost:8081) için
    // gerekiyor. Üretimde bu uçları başka kökenlere açmanın karşılığı yok.
    return { tur: "appApi", corsGerekli: gelistirme };
  }

  if (pathname === "/admin/giris") {
    return { tur: "serbest" };
  }

  return { tur: "oturumGerekli" };
}
