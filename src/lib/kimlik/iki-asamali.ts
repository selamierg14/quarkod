/**
 * İki aşamalı doğrulamanın SAF karar mantığı.
 *
 * `otp.ts`'ten ayrıldı çünkü o dosya `server-only` taşıyor — bcrypt ve
 * Prisma kullandığı için doğru olarak öyle. Ama buradaki fonksiyonların
 * hiçbirinin veritabanına ihtiyacı yok ve `server-only` altında kalmaları
 * iki şeyi imkânsız kılıyordu:
 *
 *   - bakım betiklerinin aynı kuralı kullanması (bkz.
 *     scripts/iki-asamali-hazirlik.ts — "2FA'yı açarsam kim giremez?"),
 *   - kuralı stub'sız test etmek.
 *
 * Betiğin kuralı kendi kopyasıyla yeniden yazması, bu projede tekrar eden
 * ve en sinsi hata sınıfını üretirdi: rapor "herkes girebilir" derken
 * gerçek giriş akışının başka karar vermesi.
 */

import { normalizePhone } from "./username";

/**
 * Girişte iki adımlı doğrulama açık mı.
 *
 * Test aşamasında kapalı tutuluyor: her girişte gerçek SMS gitmesi hem
 * maliyet hem de tek bir test telefonuna bağımlılık demek. Kod silinmedi,
 * yalnızca devre dışı — .env'de "true" yapınca aynen çalışır.
 */
export function twoFactorEnabled(): boolean {
  return process.env.TWO_FACTOR_ENABLED === "true";
}

/**
 * Kodun gerçekten gideceği numara.
 *
 * Test aşamasında SMS_TEST_PHONE doluysa herkesin kodu oraya gider; böylece
 * gerçek müşteri numaralarına test SMS'i gitmez. Canlıda bu değişken boş
 * bırakılır ve kod kullanıcının kendi telefonuna gider.
 */
export function deliveryPhone(userPhone: string): string {
  return process.env.SMS_TEST_PHONE?.trim() || userPhone;
}

/**
 * Bir kullanıcı için iki aşamalı doğrulamanın DURUMU.
 *
 * Bu ayrımın ayrı bir fonksiyon olmasının sebebi somut bir tuzak. Giriş
 * akışı şöyleydi:
 *
 *     if (!twoFactorEnabled() || !user.phone) { ...oturumu aç, panele gir }
 *
 * Yani bayrak açıkken bile TELEFONU OLMAYAN kullanıcı SMS adımını hiç
 * görmeden giriyordu. Veritabanında bu istisna değil KURAL: 74 aktif panel
 * kullanıcısının 51'inin telefonu yok. Bayrak açıldığı an "2FA aktif"
 * denip hesapların %80'inin tek faktörle girmeye devam etmesi, güvenlik
 * kontrolünün en kötü hâli — açık görünüyor, kapalı çalışıyor ve kimse
 * fark etmiyor çünkü giriş sorunsuz tamamlanıyor.
 *
 * Ayrıca 10 kullanıcının telefonu kayıtlı ama BOZUK (`+90555011900` —
 * bir hane eksik). Onlarda SMS sağlayıcısı numarayı reddediyor ve
 * kullanıcı hiç giremiyor. İki durum çok farklı sonuç doğuruyor, o yüzden
 * ayrı ayrı raporlanıyor: biri sessiz bir güvenlik boşluğu, diğeri sessiz
 * bir kilitlenme.
 *
 * Fonksiyon SAF: veritabanına ve ortam değişkenine dokunmuyor (bayrak
 * dışarıdan veriliyor), böylece dört dalın dördü de test edilebiliyor.
 */

/** Kod gönderilebilir mi — bayraktan BAĞIMSIZ, yalnızca numaraya bakar. */
export type OtpTelefonDurumu =
  /** Kod gönderilebilir; `telefon` normalleştirilmiş biçimde. */
  | { durum: "hazir"; telefon: string }
  /** Kullanıcının kayıtlı telefonu yok. */
  | { durum: "telefonYok" }
  /** Telefon var ama sağlayıcının kabul edeceği biçime çevrilemiyor. */
  | { durum: "telefonGecersiz" };

/** Girişin 2FA durumu — yukarıdakine "bayrak kapalı" dalını ekler. */
export type IkiAsamaliDurum = OtpTelefonDurumu | { durum: "kapali" };

/**
 * "Bu numaraya kod gönderebilir miyiz?"
 *
 * ŞİFRE akışlarının sorusu bu ve bayraktan bağımsız: `TWO_FACTOR_ENABLED`
 * "her girişte kod sorulsun mu" sorusunun cevabı, "şifre değiştirmek kimlik
 * kanıtı ister mi" sorusunun değil. İkincisinin cevabı her zaman evet —
 * açık bırakılmış bir oturumu ele geçiren kişi hesabı tek tıkla
 * devralmasın diye.
 */
export function otpTelefonu(phone: string | null | undefined): OtpTelefonDurumu {
  if (!phone?.trim()) return { durum: "telefonYok" };

  const normal = normalizePhone(phone);
  if (!normal) return { durum: "telefonGecersiz" };

  return { durum: "hazir", telefon: normal };
}

/**
 * "Bu kullanıcı girişte kod adımından geçmeli mi?"
 *
 * GİRİŞ akışının sorusu bu; yukarıdakinin üstüne bayrağı ekliyor.
 *
 * İki soruyu ayrı fonksiyona bölmenin sebebi yalnızca okunabilirlik değil:
 * tek fonksiyonda boolean bir parametreyle birleştirildiklerinde TypeScript
 * "kapali" dalını daraltamıyor ve şifre akışları, hiç oluşamayacak bir
 * durumu elle ele almak zorunda kalıyordu. İsimli iki soru, hem çağıranda
 * hem tiplerde daha dürüst.
 */
export function ikiAsamaliDurum(phone: string | null | undefined): IkiAsamaliDurum {
  if (!twoFactorEnabled()) return { durum: "kapali" };
  return otpTelefonu(phone);
}
