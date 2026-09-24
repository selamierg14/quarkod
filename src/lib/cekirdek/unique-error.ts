/**
 * Veritabanı tekillik ihlallerini kullanıcıya anlaşılır mesaja çevirir.
 *
 * Kayıt öncesi yapılan "bu kullanıcı adı var mı" kontrolü tek başına yetmez:
 * kontrol ile INSERT arasında başka bir istek aynı adı alabilir. O durumda
 * Prisma P2002 fırlatır ve kullanıcı çirkin bir hata ekranı görür. Bu yüzden
 * her kullanıcı oluşturma noktası INSERT'i de sarmalar.
 */

const ALAN_ADI: Record<string, string> = {
  username: "kullanıcı adı",
  email: "e-posta",
  slug: "işletme adresi",
  recipient: "alıcı",
  code: "kod",
};

/**
 * Hangi alanın çakıştığını bulur.
 *
 * Prisma sürücüye ve sürüme göre farklı yerlere yazıyor. Prisma 7 +
 * `@prisma/adapter-pg` ile alan adı `meta.target`ta DEĞİL, sürücü hatasının
 * içinde geliyor — canlı Postgres'e karşı ölçüldü:
 *
 *     meta.driverAdapterError.cause.constraint.fields === ["slug"]
 *
 * Eski sürümlerin `meta.target` biçimi ve son çare olarak hata metni de
 * deneniyor; üçü de tutmazsa genel mesaja düşüyoruz.
 */
export function cakisanAlanlar(error: object): string[] {
  const meta = (error as { meta?: Record<string, unknown> }).meta;

  // 1) Eski Prisma sürümleri / bazı sürücüler: meta.target
  const target = meta?.target;
  if (Array.isArray(target)) return target.map(String);
  if (typeof target === "string") return [target];

  // 2) Prisma 7 sürücü adaptörleri (pg ve sqlite): sürücü hatasının içinde
  const cause = (meta?.driverAdapterError as { cause?: unknown } | undefined)?.cause;
  const fields = (cause as { constraint?: { fields?: unknown } } | undefined)
    ?.constraint?.fields;
  if (Array.isArray(fields)) return fields.map(String);

  // 3) Son çare: "Unique constraint failed on the fields: (`username`)"
  const message = (error as { message?: unknown }).message;
  if (typeof message === "string") {
    const eslesme = message.match(/fields:\s*\(([^)]+)\)/);
    if (eslesme) {
      return eslesme[1].split(",").map((f) => f.replace(/[`'"\s]/g, ""));
    }
  }

  return [];
}

/** Prisma'nın tekillik hatasıysa Türkçe mesaj, değilse null döner. */
export function uniqueConstraintMessage(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  if ((error as { code?: unknown }).code !== "P2002") return null;

  for (const alan of cakisanAlanlar(error)) {
    // Bazı sürücüler "users.username" biçiminde veriyor.
    const kisa = alan.split(".").pop() ?? alan;
    if (ALAN_ADI[kisa]) {
      return `Bu ${ALAN_ADI[kisa]} zaten kullanılıyor. Başka bir değer deneyin.`;
    }
  }

  return "Bu kayıt zaten mevcut. Girdiğiniz bilgileri kontrol edin.";
}
