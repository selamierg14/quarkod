/**
 * TÜKETİCİ API'SİNİN YOL HARİTASI — hangi uç var, hangi metot, kim girebilir.
 *
 * Bu dosya iki soruyu birden cevaplıyor:
 *
 *   1. "Route'lar nerede?" — Next.js App Router'da her uç kendi klasöründe
 *      bir `route.ts` olarak durur (`src/app/api/app/ziyaret/route.ts`), yani
 *      tek bir yerde listelenmezler. Klasörleri tek tek gezmeden hangi
 *      uçların var olduğunu görmek mümkün değildi. Artık burada.
 *
 *   2. "Route'a gelmeden bir kontrol daha" — aşağıdaki tablo middleware
 *      tarafından, route çalışmadan ÖNCE uygulanıyor. Kimliği olmayan bir
 *      istek `jetonlu` bir uca hiç ulaşamıyor; veritabanına dokunan tek satır
 *      çalışmadan 401 dönüyor.
 *
 * KATMANLARIN İŞ BÖLÜMÜ. Buradaki kontrol KABA ve UCUZ: yalnızca "Bearer
 * başlığı var mı" bakıyor, imzayı doğrulamıyor. İmza + kullanıcının güncel
 * hâli (askıya alınmış mı, şifresi değişmiş mi) route içinde
 * `appKullaniciGerekli()` ile doğrulanıyor — orası veritabanına erişebilir,
 * middleware (Edge çalışma ortamı) erişemez. Yani bu tablo route'un
 * kontrolünün YERİNE geçmiyor, önüne geçiyor.
 *
 * Yeni bir uç eklerken buraya satır eklenmezse istek 404 alır. Bu bilinçli:
 * "unutulan uç sessizce korumasız açılır" durumundansa "unutulan uç hiç
 * çalışmaz" tercih edilir.
 */

export type Erisim =
  /** Kimlik gerekmiyor — keşfet listesi, giriş, kayıt. */
  | "acik"
  /** Geçerli bir Bearer jetonu şart. */
  | "jetonlu";

export type ApiPolitikasi = {
  erisim: Erisim;
  /** İzin verilen HTTP metotları; listede olmayan 405 alır. */
  metotlar: readonly ("GET" | "POST" | "PUT" | "PATCH" | "DELETE")[];
  /** Yol sonunda dinamik bir parça var mı (`/mekanlar/<slug>`). */
  dinamik?: boolean;
};

/**
 * Uçların tamamı. Anahtarlar `/api/app` ÖNEKİ OLMADAN yazılıyor; önek
 * `politikaBul` içinde ekleniyor ki tabloda gürültü olmasın.
 */
export const API_POLITIKALARI: Record<string, ApiPolitikasi> = {
  // --- Kimlik gerektirmeyenler ------------------------------------------
  // Uygulamayı ilk açan kişi hesap açmadan çevresinde ne olduğunu
  // görebilmeli; giriş duvarı ardındaki bir keşif ekranı kimseyi
  // kaydolmaya ikna etmez.
  "/giris": { erisim: "acik", metotlar: ["POST"] },
  "/kayit": { erisim: "acik", metotlar: ["POST"] },
  /**
   * Şifre kurtarma AÇIK olmak zorunda — girişi olmayan biri kullanıyor.
   *
   * Korumaları jeton değil: kullanıcı adına göre hız sınırı, ve yanıtın
   * kullanıcı varlığını sızdırmaması (bkz. route.ts). Kod da istemcinin
   * verdiği numaraya değil veritabanındaki DOĞRULANMIŞ numaraya gidiyor.
   */
  "/sifre-kurtar": { erisim: "acik", metotlar: ["POST", "PUT", "PATCH"] },
  "/mekanlar": { erisim: "acik", metotlar: ["GET"] },
  /**
   * Apple/Google ile giriş — AÇIK olmak zorunda, girişi olmayan kullanıyor.
   *
   * PUT (hesaba sağlayıcı bağlama) oturum istiyor ama erişim sınıfı yol
   * başına tanımlı; route içinde `appKullaniciGerekli` ile kapalı
   * (bkz. /etkinlikler'deki aynı durum).
   */
  "/sosyal-giris": { erisim: "acik", metotlar: ["GET", "POST", "PUT"] },
  /**
   * Rotalar AÇIK — ama yanıt jetona göre zenginleşiyor.
   *
   * Route zaten `appKullaniciOku` kullanıyor (zorunlu değil, varsa okur):
   * girişsiz kullanıcı rota listesini görüyor, girişli olan ek olarak
   * "hangi durakları ziyaret ettim" ve "tamamladım mı" bilgisini de
   * alıyor. Satır bir süre "jetonlu" yazıyordu ve bu, route'un desteklediği
   * girişsiz durumu middleware'de kapatıyordu: rotalar keşif içeriği,
   * uygulamayı yeni açan birine gösterilmemesi için bir sebep yok.
   */
  "/rotalar": { erisim: "acik", metotlar: ["GET"] },
  /**
   * Kullanıcı etkinlikleri — okuma AÇIK, yazma jeton istiyor.
   *
   * Tabloda tek satır olmasının sebebi GET'in girişsize de açık olması:
   * erişim sınıfı yol başına tanımlı, metot başına değil. Yazan metotlar
   * (POST/PUT/DELETE) route içinde `appKullaniciGerekli` ile kapalı —
   * yani middleware'in geçirdiği kimliksiz bir POST, veritabanına
   * dokunmadan 401 alıyor. Bu, kaba kapının ince kapının yerine
   * geçmediği örneklerden biri (bkz. dosya başındaki iş bölümü).
   */
  "/etkinlikler": { erisim: "acik", metotlar: ["GET", "POST", "PUT", "DELETE"] },
  "/mekanlar/": { erisim: "acik", metotlar: ["GET"], dinamik: true },
  // Anonim ölçüm: kim olduğunu bilmek gerekmiyor, yalnızca "kaç kez".
  "/mekan-etkilesim": { erisim: "acik", metotlar: ["POST"] },

  // --- Jeton zorunlu ----------------------------------------------------
  "/ben": { erisim: "jetonlu", metotlar: ["GET"] },
  "/profil": { erisim: "jetonlu", metotlar: ["GET"] },
  "/cuzdan": { erisim: "jetonlu", metotlar: ["GET"] },
  "/bildirimler": { erisim: "jetonlu", metotlar: ["GET"] },
  "/favoriler": { erisim: "jetonlu", metotlar: ["GET", "POST"] },
  "/konum": { erisim: "jetonlu", metotlar: ["POST"] },
  "/push": { erisim: "jetonlu", metotlar: ["POST", "DELETE"] },
  "/ziyaret": { erisim: "jetonlu", metotlar: ["POST"] },
  "/plus-talep": { erisim: "jetonlu", metotlar: ["POST"] },
  /**
   * Bildirim tercihleri — hangi kategoriden bildirim istiyor
   * (bkz. lib/biyerlere/bildirim-tercihi.ts).
   */
  "/bildirim-tercihleri": { erisim: "jetonlu", metotlar: ["GET", "PUT"] },
  /**
   * Masa rezervasyonu: müsait saatler + kendi listesi (GET), talep (POST),
   * iptal (DELETE). Müsaitlik de jeton istiyor çünkü rezervasyon zaten
   * girişsiz yapılamıyor; açık bırakmak yalnızca mekanın doluluk takvimini
   * kimliksiz taranabilir hale getirirdi.
   */
  "/rezervasyon": { erisim: "jetonlu", metotlar: ["GET", "POST", "DELETE"] },
  /** Kurtarma numarası ekleme/doğrulama/kaldırma — oturum şart. */
  "/telefon": { erisim: "jetonlu", metotlar: ["GET", "POST", "PUT", "DELETE"] },
  /**
   * Oturum İÇİNDE şifre değiştirme. Jetonu olan biri bile mevcut şifresini
   * vermeden değiştiremiyor: açık bırakılmış bir telefon, tek dokunuşla
   * hesabın devralınmasına yetmemeli.
   */
  "/sifre-degistir": { erisim: "jetonlu", metotlar: ["POST"] },
  /** Hesabı kalıcı silme — mağaza kuralı ve KVKK silme hakkı (bkz. route). */
  "/hesap": { erisim: "jetonlu", metotlar: ["DELETE"] },
  /** Çıkış — jetonu sunucuda iptal eder (bkz. route). */
  "/cikis": { erisim: "jetonlu", metotlar: ["POST"] },
};

const ONEK = "/api/app";

/**
 * Yola karşılık gelen politika; tanınmayan yolda null.
 *
 * Dinamik uçlar (`/mekanlar/<slug>`) için önek eşleşmesi yapılıyor ama
 * YALNIZCA tabloda `dinamik: true` işaretlenmiş olanlarda — aksi halde
 * `/ziyaret/herhangi-bir-sey` de `/ziyaret` politikasına düşerdi.
 */
export function politikaBul(pathname: string): ApiPolitikasi | null {
  if (!pathname.startsWith(`${ONEK}/`)) return null;
  const yol = pathname.slice(ONEK.length);

  const tam = API_POLITIKALARI[yol];
  if (tam && !tam.dinamik) return tam;

  for (const [desen, politika] of Object.entries(API_POLITIKALARI)) {
    if (!politika.dinamik) continue;
    // "/mekanlar/" öneki + en az bir karakterlik tek parça.
    if (yol.startsWith(desen)) {
      const kalan = yol.slice(desen.length);
      if (kalan.length > 0 && !kalan.includes("/")) return politika;
    }
  }
  return null;
}

export type ApiKarari =
  | { sonuc: "gecebilir" }
  | { sonuc: "bulunamadi" }
  | { sonuc: "metotYok"; izinliler: readonly string[] }
  | { sonuc: "kimlikYok" };

/**
 * Route çalışmadan önceki karar.
 *
 * `jetonVar` bilerek boolean: middleware jetonun İÇERİĞİNE bakmıyor,
 * yalnızca gönderilip gönderilmediğine. İmza doğrulaması route'un işi
 * (bkz. dosya başındaki katman açıklaması).
 */
export function apiKarari(
  pathname: string,
  metot: string,
  jetonVar: boolean,
): ApiKarari {
  const politika = politikaBul(pathname);
  if (!politika) return { sonuc: "bulunamadi" };

  // OPTIONS (CORS preflight) middleware'in kendisinde karşılanıyor.
  if (!politika.metotlar.includes(metot as "GET")) {
    return { sonuc: "metotYok", izinliler: politika.metotlar };
  }

  if (politika.erisim === "jetonlu" && !jetonVar) {
    return { sonuc: "kimlikYok" };
  }

  return { sonuc: "gecebilir" };
}
