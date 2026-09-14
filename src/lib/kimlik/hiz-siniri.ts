import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "../cekirdek/db";

/**
 * Genel istek hız sınırı.
 *
 * Projede hız sınırı YALNIZCA girişte vardı (lib/login-guard.ts). Herkese
 * açık diğer yazma uçları — kayıt, ziyaret doğrulama, metrik sayacı, kupon
 * yakma — sınırsızdı: tek bir script'le binlerce hesap açılabiliyor, bir
 * işletmenin görüntülenme sayacı şişirilebiliyordu.
 *
 * DEPO SEÇİMİ. Ayrı bir tablo açmak "doğru" cevap ama bu projede
 * geliştirme ve üretim AYNI veritabanını paylaşıyor; sırf sayaç için
 * üretimde şema değiştirmek, kazancından büyük bir risk. Bunun yerine
 * `login_attempts` tablosu yeniden kullanılıyor: alanları (anahtar +
 * ipHash + zaman) tam olarak bir hız sınırı kaydının ihtiyacı ve zaten iki
 * indeksi var. Anahtar `kanal:değer` biçiminde ad alanına alınıyor, yani
 * giriş sayaçlarıyla karışmıyor (`checkLoginAllowed` düz e-posta arıyor,
 * buradaki kayıtlarda hep iki nokta üst üste var).
 *
 * İleride üçüncü bir tüketici çıkarsa ayrı bir `RateLimit` tablosuna
 * taşımak tek dosyalık bir iş — çağıranların hiçbiri değişmez.
 *
 * SERVERLESS NOTU: sayaç bellekte değil veritabanında; Vercel'de her istek
 * başka bir örnekte çalışsa bile sınır ortak. Bellekte tutmak, örnek
 * sayısıyla çarpılan bir "sınır" demek olurdu — yani sınır değil.
 */

export type HizSiniriKarari =
  | { izin: true }
  | { izin: false; kalanDakika: number };

/** Sınır tanımı — çağıran taraf değil, burası bilir. */
export type HizSiniri = {
  /** Sayaç ad alanı; farklı uçlar birbirinin kotasını yemesin. */
  kanal: string;
  /** Pencere içinde izin verilen istek sayısı. */
  adet: number;
  /** Pencere uzunluğu (dakika). */
  dakika: number;
};

/**
 * Uçların sınırları TEK YERDE.
 *
 * Dağıtık sabitler yerine tek tablo: "kayıt ucunun sınırı neydi" sorusu
 * tek dosyada cevaplanıyor ve yeni bir uç eklerken sınır koymayı unutmak
 * gözle görülür hale geliyor.
 */
export const SINIRLAR = {
  /** Yeni Biyerlere hesabı — aynı IP'den seri kayıt. */
  kayit: { kanal: "kayit", adet: 5, dakika: 60 },
  /** Ziyaret doğrulama denemesi — başarılısı zaten 4 saat kilitli. */
  ziyaret: { kanal: "ziyaret", adet: 30, dakika: 60 },
  /** Anonim metrik sayacı — sayaç şişirmeyi ucuz olmaktan çıkarır. */
  metrik: { kanal: "metrik", adet: 60, dakika: 10 },
  /** Kasada hatalı kupon kodu denemesi. */
  kuponKodu: { kanal: "kupon", adet: 10, dakika: 10 },
  /**
   * SMS doğrulama kodu denemesi — kaba kuvvete karşı İKİNCİ katman.
   *
   * Birincisi kodun kendi deneme sayacı (MAX_ATTEMPTS, bkz. lib/kimlik/otp.ts)
   * ve o artık atomik. Ama tek katman yetmiyor: sayaç KOD BAŞINA, yani
   * saldırgan kod yakıldıktan sonra yeni kod isteyip baştan beş hak daha
   * alabiliyor. Bu sınır KULLANICI BAŞINA ve kodlar arası taşıyor.
   *
   * 20/10dk cömert görünüyor ama altı haneli bir kodu denemek için
   * milyonlarca istek gerekiyor; buradaki amaç meşru kullanıcıyı
   * engellememek, saldırıyı imkânsız kılmak.
   */
  otpDeneme: { kanal: "otp", adet: 20, dakika: 10 },
} as const satisfies Record<string, HizSiniri>;

function anahtarla(kanal: string, deger: string): string {
  // İki nokta ad alanını ayırıyor; giriş sayaçları düz e-posta olduğu için
  // iki küme asla çakışmıyor.
  return `${kanal}:${deger}`.slice(0, 190);
}

function ipOzeti(ip: string): string {
  // Ham IP saklanmıyor — sayaç için kimliğin kendisi gerekmiyor, yalnızca
  // "aynı kaynak mı" sorusunun cevabı gerekiyor (KVKK ilkesi: en az veri).
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

/** İsteği atan tarafın kimliği — oturum varsa kullanıcı, yoksa IP özeti. */
export async function istekKimligi(kullaniciId?: string | null): Promise<string> {
  if (kullaniciId) return `u_${kullaniciId}`;
  const basliklar = await headers();
  const forwarded = basliklar.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || basliklar.get("x-real-ip") || "";
  // IP hiç okunamıyorsa (bazı çalıştırma ortamları) sınır uygulanamaz;
  // "anonim" tek bir kovaya düşürmek, tüm kullanıcıları birbirinin
  // kotasından sorumlu tutmak olurdu.
  return ip ? `ip_${ipOzeti(ip)}` : "";
}

/** Sayaç deposu — testte sahte bir nesne verilebilsin diye ayrık. */
type Sayac = {
  loginAttempt: {
    count: (args: unknown) => Promise<number>;
    findFirst: (args: unknown) => Promise<{ createdAt: Date } | null>;
    create: (args: unknown) => Promise<unknown>;
  };
};

/**
 * Sayacı OKUR, artırmaz.
 *
 * "Yalnızca başarısız denemeyi say" gereken yerler için: kasadaki kupon
 * yakma ucunda her isteği saymak, yoğun bir kafede meşru yakmaları
 * kotadan düşürüp personeli kilitliyordu. Orada kota kontrolü buradan,
 * artırma ise yalnızca kod yanlışken `hizSiniriIsaretle` ile yapılıyor.
 */
export async function hizSiniriKontrolFor(
  db: Sayac,
  sinir: HizSiniri,
  kimlik: string,
): Promise<HizSiniriKarari> {
  if (!kimlik) return { izin: true };

  const anahtar = anahtarla(sinir.kanal, kimlik);
  const pencereBasi = new Date(Date.now() - sinir.dakika * 60 * 1000);

  const adet = await db.loginAttempt.count({
    where: { email: anahtar, createdAt: { gte: pencereBasi } },
  });
  if (adet < sinir.adet) return { izin: true };

  const enEski = await db.loginAttempt.findFirst({
    where: { email: anahtar, createdAt: { gte: pencereBasi } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });
  // Pencere kayan değil sabit: en eski kayıt düştüğünde kota açılıyor.
  const acilis = (enEski?.createdAt.getTime() ?? Date.now()) + sinir.dakika * 60 * 1000;
  return {
    izin: false,
    kalanDakika: Math.max(1, Math.ceil((acilis - Date.now()) / 60000)),
  };
}

/** Sayacı bir artırır. */
export async function hizSiniriIsaretleFor(
  db: Sayac,
  sinir: HizSiniri,
  kimlik: string,
): Promise<void> {
  if (!kimlik) return;
  await db.loginAttempt.create({
    data: { email: anahtarla(sinir.kanal, kimlik), success: true },
  });
}

/**
 * Kontrol + kayıt tek çağrıda — VARSAYILAN kullanım.
 *
 * Ayrı `kontrol()` ve `kaydet()` çağrılarını çağırana bırakmak,
 * ikincisinin unutulup sınırın sessizce çalışmaması demek; hız
 * sınırlarının en yaygın hatası bu. İkisini ayrı isteyen yerler
 * yukarıdaki fonksiyonları bilerek ve gerekçesiyle çağırıyor.
 */
export async function hizSiniriUygulaFor(
  db: Sayac,
  sinir: HizSiniri,
  kimlik: string,
): Promise<HizSiniriKarari> {
  const karar = await hizSiniriKontrolFor(db, sinir, kimlik);
  if (!karar.izin) return karar;
  await hizSiniriIsaretleFor(db, sinir, kimlik);
  return karar;
}

/** Uygulama içinden kullanım — depo ve kimlik hazır gelir. */
export async function hizSiniriUygula(
  sinir: HizSiniri,
  kullaniciId?: string | null,
): Promise<HizSiniriKarari> {
  const kimlik = await istekKimligi(kullaniciId);
  return hizSiniriUygulaFor(prisma as unknown as Sayac, sinir, kimlik);
}

export async function hizSiniriKontrol(
  sinir: HizSiniri,
  kullaniciId?: string | null,
): Promise<HizSiniriKarari> {
  return hizSiniriKontrolFor(prisma as unknown as Sayac, sinir, await istekKimligi(kullaniciId));
}

export async function hizSiniriIsaretle(
  sinir: HizSiniri,
  kullaniciId?: string | null,
): Promise<void> {
  return hizSiniriIsaretleFor(prisma as unknown as Sayac, sinir, await istekKimligi(kullaniciId));
}

/** Sınır aşıldığında dönecek standart mesaj. */
export function hizSiniriMesaji(karar: Extract<HizSiniriKarari, { izin: false }>): string {
  return `Çok fazla istek gönderildi. ${karar.kalanDakika} dakika sonra tekrar deneyin.`;
}
