import type { JWTPayload, JWTVerifyOptions } from "jose";

/**
 * JETON DOĞRULAMA KURALLARI — tüketici oturumu, panel oturumu ve şifre
 * sıfırlama biletinin ORTAK sıkı çerçevesi.
 *
 * Üç doğrulama da yalnızca imza, süre ve (varsa) izleyici kontrol
 * ediyordu. Doğru anahtarla imzalanmış şu jetonların HEPSİ kabul
 * ediliyordu (canlı denendi):
 *
 *   - `exp` taşımayan jeton          → sonsuza kadar geçerli
 *   - 10 yıllık `exp`                → uygulamanın 30 günlük kuralını aşıyor
 *   - HS512 ile imzalanmış jeton     → algoritma sabitlenmemiş
 *   - `iat`'ı 10 yıl ileride jeton   → ŞİFRE DEĞİŞİKLİĞİYLE İPTAL EDİLEMİYOR
 *
 * Sonuncusu en tehlikelisi: şifre değişince eski oturumlar "jeton şifre
 * değişikliğinden önce mi üretildi" sorusuyla düşürülüyor. Geleceğe
 * tarihli bir jeton bu soruya hep "hayır" diyor.
 *
 * Hiçbiri dışarıdan sahtelenemez — hepsi anahtarı gerektiriyor. Ama
 * anahtar bir gün sızarsa (yanlış commit, günlük dökümü) "anahtarı
 * değiştirmek yeter" varsayımı bu açıklarla çöküyor. Kurallar bu yüzden
 * savunmanın ikinci katmanı.
 */

/** Sunucular arası saat kayması payı (saniye). */
export const SAAT_TOLERANSI_SN = 60;

export function katiDogrulama(azamiOmurSn: number, izleyici?: string): JWTVerifyOptions {
  return {
    // Yalnızca üretirken kullandığımız algoritma. `alg: none` jose'de zaten
    // reddediliyor; bu satır aynı anahtar ailesindeki diğer algoritmaları
    // (HS384/HS512) da kapatıyor.
    algorithms: ["HS256"],
    // `jti`: sunucu tarafı iptal bu kimliğe dayanıyor (bkz. jeton-iptal.ts);
    // kimliksiz jeton iptal edilemez, o yüzden kabul de edilmez.
    requiredClaims: ["exp", "iat", "sub", "jti"],
    // `exp` ne derse desin, `iat`tan bu yana geçen süre bu sınırı aşamaz.
    maxTokenAge: `${azamiOmurSn}s`,
    clockTolerance: SAAT_TOLERANSI_SN,
    ...(izleyici ? { audience: izleyici } : {}),
  };
}

/**
 * `iat` gelecekte mi?
 *
 * jose'nin kendi kontrollerine ek olarak açıkça bakılıyor: bu kontrolün
 * sessizce kaybolması, şifre değişikliğiyle iptal mekanizmasını doğrudan
 * etkisiz kılar. Sürüm yükseltmesinde kütüphane davranışı değişse bile
 * burası değişmez.
 */
export function gelecekteMi(payload: JWTPayload, simdiSn = Math.floor(Date.now() / 1000)): boolean {
  return typeof payload.iat !== "number" || payload.iat > simdiSn + SAAT_TOLERANSI_SN;
}
