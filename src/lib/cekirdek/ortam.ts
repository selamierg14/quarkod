/**
 * Ortam değişkenlerinin TEK KAPISI.
 *
 * Sorun neydi: `process.env.AUTH_SECRET` sekiz ayrı yerde okunuyordu ve
 * "tanımlı mı, yeterince uzun mu" doğrulaması BEŞ dosyada birebir
 * kopyalanmıştı (session-token, app-oturum, kupon-kod, pending-password,
 * giris/actions). Aynı kuralın beş kopyası üç şey demek:
 *
 *   - biri güncellenip diğerleri unutulur (ör. asgari uzunluk değişirse),
 *   - hata mesajı yerden yere değişir, kurulum yapan kişi şaşırır,
 *   - "bu değişkeni kim kullanıyor" sorusunun cevabı grep'e kalır.
 *
 * Anahtarlar serbest metin değil sabit bir kayıt (`ORTAM`): yanlış yazılmış
 * bir değişken adı derleme zamanında yakalanıyor, çalışma zamanında
 * `undefined` olarak sızmıyor.
 */

/**
 * Tanınan ortam değişkenleri ve nasıl davranacakları.
 *
 * `gizli: true` olanlar loglanmamalı ve hata mesajlarında değerleri
 * gösterilmemeli. `enAzUzunluk`, kriptografik anahtarların kazara kısa
 * bırakılmasını engelliyor — "AUTH_SECRET=test" ile açılan bir üretim
 * ortamı, hiç anahtar olmamasından farksız.
 */
export const ORTAM = {
  // Zorunlu asgari 16, ÖNERİLEN 32. Eşik 32'ye çekilmedi çünkü hâlihazırda
  // çalışan kurulumlarda 16-31 karakterlik bir anahtar olabilir ve
  // uygulamayı açılışta çökertmek, güvenlik kazancından büyük bir zarar
  // olurdu. `.env.example` 36 karakterlik üretim komutunu veriyor.
  AUTH_SECRET: { gizli: true, enAzUzunluk: 16, zorunlu: true },
  DATABASE_URL: { gizli: true, enAzUzunluk: 1, zorunlu: true },
  // Migration'ların kullandığı havuzsuz bağlantı; yoksa DATABASE_URL'e düşülür.
  DIRECT_URL: { gizli: true, enAzUzunluk: 1, zorunlu: false },
  NEXT_PUBLIC_APP_URL: { gizli: false, enAzUzunluk: 1, zorunlu: false },
  VAPID_PRIVATE_KEY: { gizli: true, enAzUzunluk: 1, zorunlu: false },
  SMTP_PASS: { gizli: true, enAzUzunluk: 1, zorunlu: false },
  SMS_API_PASS: { gizli: true, enAzUzunluk: 1, zorunlu: false },
  CRON_SECRET: { gizli: true, enAzUzunluk: 16, zorunlu: false },
} as const;

export type OrtamAnahtari = keyof typeof ORTAM;

/**
 * Zorunlu bir gizli anahtarı okur; yoksa ya da çok kısaysa AÇIKLAYICI bir
 * hata fırlatır.
 *
 * Fırlatmak bilinçli: imza anahtarı olmadan üretilen bir jeton, güvenlik
 * kontrolü varmış gibi görünüp hiçbir şey doğrulamaz. Sessizce boş bir
 * değere düşmektense uygulamanın açılmaması doğru davranış.
 */
export function gizliAnahtar(ad: Extract<OrtamAnahtari, "AUTH_SECRET" | "DATABASE_URL">): string {
  const tanim = ORTAM[ad];
  const deger = process.env[ad];

  if (!deger || deger.length < tanim.enAzUzunluk) {
    // Değerin kendisi ASLA mesaja girmiyor — hata logu bir sır sızdırma
    // yoluna dönüşmemeli.
    throw new Error(
      `${ad} tanımlı değil veya çok kısa (en az ${tanim.enAzUzunluk} karakter). ` +
        `.env dosyanıza ekleyin. Üretmek için: openssl rand -base64 36`,
    );
  }
  return deger;
}

/** İsteğe bağlı bir değer; yoksa null (boş dize de yok sayılır). */
export function ortamDegeri(ad: OrtamAnahtari): string | null {
  const deger = process.env[ad]?.trim();
  return deger ? deger : null;
}

/** Bir özelliğin açık olup olmadığı — "1" dışındaki her şey kapalı sayılır. */
export function ortamAcikMi(ad: string): boolean {
  return process.env[ad] === "1";
}

/**
 * Kurulum sağlığı — eksik zorunlu değişkenlerin listesi.
 *
 * Panelin "Sistem sağlığı" ekranı ve dağıtım öncesi kontrol için: hangi
 * anahtarın eksik olduğunu uygulama çökmeden önce söyleyebilmek, ilk
 * kurulumda saatler kazandırıyor.
 */
export function eksikZorunluAnahtarlar(): OrtamAnahtari[] {
  return (Object.keys(ORTAM) as OrtamAnahtari[]).filter((ad) => {
    const tanim = ORTAM[ad];
    if (!tanim.zorunlu) return false;
    const deger = process.env[ad];
    return !deger || deger.length < tanim.enAzUzunluk;
  });
}
