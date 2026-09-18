import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { SAAT_TOLERANSI_SN } from "./jeton-kurallari";

/**
 * APPLE / GOOGLE İLE GİRİŞ — kimlik jetonunun doğrulanması.
 *
 * NEDEN: kayıt ekranı, uygulamayı indiren kişiyle hesabı olan kişi
 * arasındaki en büyük kayıp noktası. Kullanıcı adı seçip şifre uydurmak,
 * "sadece bakmak isteyen" birinin vazgeçmesi için fazlasıyla yeterli.
 * Ayrıca App Store, uygulamada başka bir sosyal giriş varsa Apple ile
 * girişi ZORUNLU tutuyor (5.1.1.iv) — yani Google'ı ekleyip Apple'ı
 * eklememek bir seçenek değil.
 *
 * GÜVENLİĞİN ÖZÜ TEK CÜMLE: istemcinin gönderdiği hiçbir şeye
 * inanmıyoruz. Uygulama yalnızca sağlayıcının imzaladığı KİMLİK JETONUNU
 * (OpenID Connect `id_token`) taşıyor; kimin kim olduğunu bu sunucu,
 * jetonu Apple/Google'ın kendi açık anahtarlarıyla doğrulayarak
 * belirliyor. "Şu kullanıcıyım" diyen bir gövde kabul edilseydi, herkes
 * herkesin hesabına girerdi.
 *
 * Üç iddia ayrı ayrı kontrol ediliyor:
 *
 *   - imza  → sağlayıcının JWKS'i (uzaktan, önbellekli)
 *   - `iss` → jetonu gerçekten o sağlayıcı mı üretti
 *   - `aud` → BİZİM uygulamamız için mi üretildi. Bu olmadan, saldırgan
 *             başka bir uygulama için alınmış geçerli bir Google jetonunu
 *             buraya getirip o kişinin hesabına girebilirdi.
 *
 * YAPILANDIRILMAMIŞSA KAPALI. İstemci kimlikleri (`aud` karşılıkları)
 * ortam değişkeninde yoksa sağlayıcı hiç açılmıyor: doğrulanamayan bir
 * jetonu "geçerli say" ihtimali doğmasın.
 */

/** Test edilebilirlik için gevşek tip: `process.env` bunu karşılıyor. */
type Ortam = Record<string, string | undefined>;

export const SOSYAL_SAGLAYICILAR = ["google", "apple"] as const;
export type SosyalSaglayici = (typeof SOSYAL_SAGLAYICILAR)[number];

export function gecerliSaglayiciMi(deger: string): deger is SosyalSaglayici {
  return (SOSYAL_SAGLAYICILAR as readonly string[]).includes(deger);
}

type SaglayiciTanimi = {
  issuer: string[];
  jwksUrl: string;
  /** `aud` karşılıklarının okunacağı ortam değişkeni (virgülle ayrılmış). */
  ortamAnahtari: string;
};

const TANIMLAR: Record<SosyalSaglayici, SaglayiciTanimi> = {
  google: {
    // Google her iki biçimi de kullanıyor; ikisi de meşru.
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    jwksUrl: "https://www.googleapis.com/oauth2/v3/certs",
    ortamAnahtari: "GOOGLE_ISTEMCI_IDLERI",
  },
  apple: {
    issuer: ["https://appleid.apple.com"],
    jwksUrl: "https://appleid.apple.com/auth/keys",
    ortamAnahtari: "APPLE_ISTEMCI_IDLERI",
  },
};

/** "a, b ,c" → ["a","b","c"] — boşluklar ve boş parçalar ayıklanıyor. */
export function kimlikleriCoz(ham: string | undefined): string[] {
  if (!ham) return [];
  return ham
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export function saglayiciKimlikleri(
  saglayici: SosyalSaglayici,
  ortam: Ortam = process.env,
): string[] {
  return kimlikleriCoz(ortam[TANIMLAR[saglayici].ortamAnahtari]);
}

/** Arayüzün hangi düğmeleri çizeceği — yapılandırılmamış sağlayıcı yok sayılıyor. */
export function acikSaglayicilar(ortam: Ortam = process.env): SosyalSaglayici[] {
  return SOSYAL_SAGLAYICILAR.filter((s) => saglayiciKimlikleri(s, ortam).length > 0);
}

/**
 * JWKS istemcileri MODÜL DÜZEYİNDE önbellekleniyor.
 *
 * `createRemoteJWKSet` anahtarları kendi içinde saklıyor ve süresi
 * dolunca tazeliyor. Her istekte yenisini kurmak, her girişte Google'a
 * fazladan bir ağ turu demek olurdu — ve sağlayıcı yavaşladığında
 * girişin tamamı ona takılırdı.
 */
const jwksOnbellegi = new Map<SosyalSaglayici, ReturnType<typeof createRemoteJWKSet>>();

function jwks(saglayici: SosyalSaglayici) {
  const mevcut = jwksOnbellegi.get(saglayici);
  if (mevcut) return mevcut;
  const yeni = createRemoteJWKSet(new URL(TANIMLAR[saglayici].jwksUrl));
  jwksOnbellegi.set(saglayici, yeni);
  return yeni;
}

export type SosyalKimlik = {
  saglayici: SosyalSaglayici;
  /** Sağlayıcıdaki kalıcı kullanıcı kimliği (`sub`). Hesap bağı bunun üstünde. */
  sub: string;
  eposta: string | null;
  /** E-posta sağlayıcı tarafından doğrulanmış mı. */
  epostaDogrulandi: boolean;
};

export type DogrulamaSonucu =
  | { ok: true; kimlik: SosyalKimlik }
  | { ok: false; hata: string };

/**
 * Sağlayıcının imzaladığı kimlik jetonunu doğrular.
 *
 * Hata mesajları BİLEREK genel: "imza geçersiz" ile "aud tutmuyor"
 * arasındaki farkı dışarıya söylemek, yapılandırmamız hakkında bilgi
 * vermek olurdu. Ayrıntı yalnızca sunucu günlüğüne düşüyor.
 */
export async function kimlikJetonunuDogrula(
  saglayici: SosyalSaglayici,
  jeton: string,
  ortam: Ortam = process.env,
): Promise<DogrulamaSonucu> {
  const kimlikler = saglayiciKimlikleri(saglayici, ortam);
  if (kimlikler.length === 0) {
    return { ok: false, hata: "Bu giriş yöntemi şu anda kullanılamıyor." };
  }
  if (!jeton || jeton.length > 4096) {
    return { ok: false, hata: "Giriş doğrulanamadı." };
  }

  const tanim = TANIMLAR[saglayici];

  try {
    const { payload } = await jwtVerify(jeton, jwks(saglayici), {
      issuer: tanim.issuer,
      audience: kimlikler,
      requiredClaims: ["sub", "exp", "iat", "aud", "iss"],
      clockTolerance: SAAT_TOLERANSI_SN,
    });

    const kimlik = kimligeCevir(saglayici, payload);
    if (!kimlik) return { ok: false, hata: "Giriş doğrulanamadı." };
    return { ok: true, kimlik };
  } catch (error) {
    console.error(`[sosyal-giris] ${saglayici} jetonu doğrulanamadı:`, error);
    return { ok: false, hata: "Giriş doğrulanamadı." };
  }
}

/**
 * Doğrulanmış yükü bizim biçimimize çevirir.
 *
 * `email_verified` Apple'da metin ("true"), Google'da boolean geliyor;
 * ikisi de kabul ediliyor. Doğrulanmamış e-posta `epostaDogrulandi:
 * false` ile işaretleniyor ve hesap EŞLEŞTİRMEK için asla kullanılmıyor —
 * doğrulanmamış bir adresle başkasının hesabına bağlanmak, devralmanın
 * en kolay yolu olurdu.
 */
export function kimligeCevir(
  saglayici: SosyalSaglayici,
  payload: JWTPayload,
): SosyalKimlik | null {
  const sub = typeof payload.sub === "string" ? payload.sub : "";
  if (!sub) return null;

  const epostaHam = payload.email;
  const eposta = typeof epostaHam === "string" && epostaHam.includes("@") ? epostaHam : null;

  const dogrulandiHam = payload.email_verified;
  const epostaDogrulandi =
    dogrulandiHam === true || dogrulandiHam === "true" ? true : false;

  return { saglayici, sub, eposta, epostaDogrulandi };
}

/**
 * Sosyal girişle açılan hesaba kullanıcı adı üretir.
 *
 * Kullanıcı adı bu projede hem giriş kimliği hem de sistem genelinde
 * tekil (bkz. AppUser.username). Sosyal girişte kullanıcı ad seçmiyor —
 * seçtirmek, kaldırmaya çalıştığımız adımın ta kendisi olurdu — o yüzden
 * addan türetiliyor.
 *
 * `mevcutMu` çağıran tarafın veritabanı kontrolü; çakışmada sona sayı
 * ekleniyor. Sonsuz döngü yok: belirli bir denemeden sonra rastgele
 * eke geçiliyor.
 */
export function kullaniciAdiUret(
  ad: string,
  mevcutMu: (aday: string) => boolean,
  rastgele: () => number = Math.random,
): string {
  const taban = adiSadelestir(ad) || "kasif";

  if (!mevcutMu(taban)) return taban;
  for (let i = 2; i <= 20; i++) {
    const aday = `${taban}${i}`;
    if (!mevcutMu(aday)) return aday;
  }
  // 20 deneme de tutmadıysa ad çok yaygın; rastgele ek tek turda çözüyor.
  for (let i = 0; i < 50; i++) {
    const aday = `${taban}${Math.floor(rastgele() * 900000 + 100000)}`;
    if (!mevcutMu(aday)) return aday;
  }
  throw new Error("kullanıcı adı üretilemedi");
}

/**
 * "Ayşe Yılmaz" → "ayseyilmaz".
 *
 * Türkçe harfler karşılıklarına çevriliyor: kullanıcı adı desenine
 * (bkz. lib/cekirdek/desenler.ts) uyması ve adres/klavye sorunu
 * çıkarmaması gerekiyor.
 */
export function adiSadelestir(ad: string): string {
  const harita: Record<string, string> = {
    ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u",
    Ç: "c", Ğ: "g", İ: "i", Ö: "o", Ş: "s", Ü: "u",
  };
  return ad
    .trim()
    .split("")
    .map((h) => harita[h] ?? h)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 16);
}
