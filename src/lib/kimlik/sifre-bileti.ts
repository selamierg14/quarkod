import { SignJWT, jwtVerify } from "jose";
import { gizliAnahtar } from "../cekirdek/ortam";
import { OTP_TTL_MINUTES } from "./otp";

/**
 * ŞİFRE SIFIRLAMA BİLETİ — "bu kişi az önce SMS kodunu doğruladı" belgesi.
 *
 * Neden gerekti: kurtarma akışı üç ekrana ayrıldı (kullanıcı adı → kod →
 * yeni şifre ×2). Kod ikinci ekranda doğrulanıyor ve TEK KULLANIMLIK
 * olduğu için orada yanıyor; üçüncü ekrana gelindiğinde elde onu tekrar
 * ispatlayacak bir şey kalmıyor. Bilet o boşluğu dolduruyor.
 *
 * Alternatif neydi ve neden seçilmedi:
 *
 *   - Kodu üçüncü ekranda da istemek: kullanıcı altı haneyi iki kez
 *     yazardı, üstelik ikinci ekranda "kod doğru mu" geri bildirimi
 *     veremezdik.
 *   - Kodu istemci tarafında saklayıp son adımda geri göndermek: sunucu
 *     için hiçbir farkı yok, kod hâlâ tek kullanımlık. Yakılmamış bir kodu
 *     ekranlar arasında taşımak ise kodun ömrünü uzatmak demek.
 *   - Panelin `challenge` çerezi: çerez tarayıcıya bağlı, Expo uygulaması
 *     aynı uçları Bearer jetonla kullanıyor. Bilet gövdede taşınıyor,
 *     ikisi de aynı yolu kullanabiliyor.
 *
 * Güvenlik özellikleri:
 *
 *   - AYRI AUDIENCE. Oturum jetonu bilet yerine geçemiyor, bilet de oturum
 *     jetonu yerine. İmza aynı anahtarla ama `aud` iddiası farklı ve
 *     doğrulama onu ŞART koşuyor (bkz. app-oturum.ts'teki aynı ayrım).
 *   - KISA ÖMÜR. Kodun kendisiyle aynı: 3 dakika. Doğrulanmış bir kodun
 *     açtığı pencere, kodun kendi penceresinden uzun olmamalı.
 *   - ŞİFRE TAŞIMIYOR. Biletin içinde yalnızca kullanıcı kimliği var; yeni
 *     şifre son istekte geliyor ve hiçbir yerde beklemiyor.
 */
const AUDIENCE = "biyerlere-sifre-sifirlama";

/**
 * Biletin ömrü, kodun ömrüyle aynı: 3 dakika.
 *
 * Aynı sabitten türüyor ki ikisi ayrışmasın — kod süresi değişince bilet
 * süresi de değişsin.
 */
export const BILET_SURESI_SN = OTP_TTL_MINUTES * 60;

function anahtar(): Uint8Array {
  return new TextEncoder().encode(gizliAnahtar("AUTH_SECRET"));
}

export async function sifreBiletiUret(appUserId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(appUserId)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${BILET_SURESI_SN}s`)
    .sign(anahtar());
}

/**
 * Bileti çözer; imza, süre ya da audience tutmuyorsa null.
 *
 * Veritabanına BAKMIYOR — "bu bilet bizim mi" sorusunu cevaplıyor.
 * "Kullanıcı hâlâ var mı, aktif mi" sorusu çağıranın işi.
 */
export async function sifreBiletiCoz(bilet: string): Promise<{ appUserId: string } | null> {
  try {
    const { payload } = await jwtVerify(bilet, anahtar(), { audience: AUDIENCE });
    return payload.sub ? { appUserId: payload.sub } : null;
  } catch {
    return null;
  }
}
