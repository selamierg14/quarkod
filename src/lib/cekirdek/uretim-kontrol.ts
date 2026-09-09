/**
 * Üretime çıkarken yanlış ayarla açılmayı engelleyen kontroller.
 *
 * Buradaki hataların hepsi sessizdir: sistem çalışıyor görünür, sorun aylar
 * sonra fark edilir. Bir tanesi (SMS_TEST_PHONE) doğrudan güvenlik açığıdır —
 * bütün müşterilerin doğrulama kodu tek bir telefona düşer. Bu yüzden uyarı
 * vermek yerine sunucuyu hiç açmıyoruz: kapalı sistem, sessizce yanlış
 * çalışan sistemden iyidir.
 *
 * Geliştirmede hiçbiri uygulanmaz.
 */

export type Ayarlar = Record<string, string | undefined>;

/** Üretimde açılışı engelleyecek sorunlar; sorun yoksa boş dizi. */
export function uretimSorunlari(env: Ayarlar): string[] {
  const sorunlar: string[] = [];

  const secret = env.AUTH_SECRET?.trim() ?? "";
  if (!secret) {
    sorunlar.push(
      "AUTH_SECRET boş. Oturum çerezleri imzalanamaz. Üretin: openssl rand -base64 36",
    );
  } else if (secret.length < 32) {
    sorunlar.push(
      `AUTH_SECRET çok kısa (${secret.length} karakter, en az 32 olmalı). ` +
        "Kısa anahtar denenerek bulunabilir; bulan kişi istediği kullanıcı adına oturum açar.",
    );
  }

  const url = env.NEXT_PUBLIC_APP_URL?.trim() ?? "";
  if (!url) {
    sorunlar.push("NEXT_PUBLIC_APP_URL boş. QR kodları geçersiz adrese basılır.");
  } else if (/localhost|127\.0\.0\.1/.test(url)) {
    sorunlar.push(
      `NEXT_PUBLIC_APP_URL hâlâ localhost ("${url}"). Bu adresle basılan QR kodları ` +
        "müşterinin telefonunda açılmaz.",
    );
  } else if (url.startsWith("http://")) {
    sorunlar.push(
      `NEXT_PUBLIC_APP_URL şifresiz ("${url}"). Oturum çerezi "secure" işaretli ` +
        "olduğu için http üzerinden panele giriş yapılamaz; https kullanın.",
    );
  }

  if (env.SMS_TEST_PHONE?.trim()) {
    sorunlar.push(
      "SMS_TEST_PHONE dolu. Bu değişken TÜM kullanıcıların doğrulama kodunu tek " +
        "bir telefona yönlendirir; üretimde boş olmalı.",
    );
  }

  // 2FA açıksa SMS gerçekten çalışmalı, yoksa kimse giriş yapamaz.
  if (env.TWO_FACTOR_ENABLED === "true") {
    const eksik = ["SMS_API_URL", "SMS_API_USER", "SMS_API_PASS", "SMS_SENDER"].filter(
      (k) => !env[k]?.trim(),
    );
    if (eksik.length) {
      sorunlar.push(
        `2FA açık ama SMS ayarları eksik (${eksik.join(", ")}). ` +
          "Kod gönderilemeyeceği için hiç kimse panele giremez.",
      );
    }
  }

  return sorunlar;
}
