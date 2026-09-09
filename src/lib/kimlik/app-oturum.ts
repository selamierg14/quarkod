import { SignJWT, jwtVerify } from "jose";

/**
 * Biyerlere (tüketici) oturum jetonları.
 *
 * Panelin oturumundan (lib/session-token.ts) BİLEREK ayrı bir dosya ve ayrı
 * bir doğrulama yolu. İki tarafın jetonları asla birbirinin yerine
 * geçmemeli: tüketici jetonuyla panele girilememeli, panel jetonuyla da
 * tüketici uçlarına gidilememeli.
 *
 * Ayrım "aud" (audience) iddiasıyla kuruluyor:
 *  - Tüketici jetonu `aud: "biyerlere-app"` taşır ve doğrulama bunu ŞART
 *    koşar. Panel jetonunda bu iddia hiç yok, dolayısıyla burada reddedilir.
 *  - Ters yön zaten kapalı: panel doğrulaması geçerli bir `role` iddiası
 *    arıyor (bkz. gecerliRolMu), tüketici jetonunda rol yok.
 *
 * Aynı AUTH_SECRET kullanılıyor — ayrım imzada değil izleyicide. Ayrı bir
 * gizli anahtar da kurulabilirdi ama bu, kurulumda unutulabilecek ikinci
 * bir ortam değişkeni demekti; audience kontrolü kriptografik olarak
 * yeterli ve unutulamaz (doğrulama fonksiyonu onsuz çalışmıyor).
 */
const AUDIENCE = "biyerlere-app";

/**
 * Mobil uygulama oturumu panelden uzun yaşıyor: 30 gün.
 *
 * Panel 12 saatte bir yeniden giriş isteyebilir çünkü ortak bir bilgisayarda
 * açık kalabiliyor. Telefon kişisel bir cihaz ve her açılışta şifre sormak
 * uygulamayı kullanılmaz kılar. Çalınan oturumun kapatılması yine mümkün:
 * kullanıcı şifresini değiştirince `passwordChangedAt` eski jetonları
 * geçersizleştiriyor (bkz. appJetonGecerliMi).
 */
export const APP_OTURUM_SURESI = 60 * 60 * 24 * 30;

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET tanımlı değil veya çok kısa. .env dosyasına en az 32 karakterlik bir değer yazın.",
    );
  }
  return new TextEncoder().encode(secret);
}

export type AppJeton = {
  id: string;
  username: string;
  name: string;
  /** Jetonun üretildiği an (saniye). Şifre değişiminde eskiyi elemek için. */
  issuedAt: number;
};

export async function appJetonUret(kullanici: {
  id: string;
  username: string;
  name: string;
}): Promise<string> {
  return new SignJWT({ username: kullanici.username, name: kullanici.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(kullanici.id)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${APP_OTURUM_SURESI}s`)
    .sign(secretKey());
}

/**
 * Jetonu çözer. İmza, süre ve audience geçerli değilse null.
 *
 * Veritabanına bakmaz — "bu jeton bizim mi" sorusunu cevaplar, "kullanıcı
 * hâlâ aktif mi" sorusunu değil. İkincisi appJetonGecerliMi'nin işi.
 */
export async function appJetonCoz(token: string): Promise<AppJeton | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      audience: AUDIENCE,
    });
    if (!payload.sub || typeof payload.username !== "string") return null;

    return {
      id: payload.sub,
      username: payload.username,
      name: typeof payload.name === "string" ? payload.name : "",
      issuedAt: typeof payload.iat === "number" ? payload.iat : 0,
    };
  } catch {
    return null;
  }
}

/**
 * Jetonun taşıdığı oturumun hâlâ geçerli olup olmadığı.
 *
 * Saf tutuldu ki testlenebilsin: imzası doğru bir jeton, kullanıcı askıya
 * alındığında ya da şifresini değiştirdiğinde de reddedilmeli.
 */
export function appOturumIptalSebebi(
  kullanici: { active: boolean; passwordChangedAt: Date | null } | null,
  jetonUretimAni: number,
): string | null {
  if (!kullanici) return "kullanıcı yok";
  if (!kullanici.active) return "hesap askıda";
  if (kullanici.passwordChangedAt) {
    // Saniye çözünürlüğü: jetonun `iat` alanı saniye cinsinden.
    const degisim = Math.floor(kullanici.passwordChangedAt.getTime() / 1000);
    if (jetonUretimAni < degisim) return "şifre değişti";
  }
  return null;
}

/**
 * `Authorization: Bearer <jeton>` başlığından jetonu ayıklar.
 *
 * Çerez değil başlık: mobil uygulama çerez yönetmiyor, jetonu kendi
 * güvenli deposunda (Keychain / Keystore) tutup her istekte başlıkta
 * gönderiyor. Ayrıca CSRF yüzeyi de böylece hiç oluşmuyor.
 */
export function bearerJetonu(authorization: string | null): string | null {
  if (!authorization) return null;
  const eslesme = authorization.match(/^Bearer\s+(.+)$/i);
  return eslesme ? eslesme[1].trim() || null : null;
}
