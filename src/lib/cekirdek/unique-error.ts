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
 * içinde geliyor. Üstelik biçim 7.10'da değişti — ikisi de canlı Postgres'e
 * karşı ölçüldü:
 *
 *     ≤ 7.9   cause.constraint = { fields: ["slug"] }
 *     ≥ 7.10  cause.constraint = { index: "businesses_slug_key" },
 *             cause.table      = "businesses"
 *
 * 7.10 sürücüsü Postgres kısıt adını verdiğinde (her zaman veriyor) alan
 * listesini hiç göndermiyor. Bu ayrıştırıcı yalnızca ilk biçimi tanırken
 * slug çakışmasında yeniden deneme çalışmaz olmuş, aynı adlı ikinci
 * işletme 500 alıyordu (slug.test.ts yakaladı).
 *
 * Kısıt adından alan çıkarmak Prisma'nın adlandırma kuralına dayanıyor:
 * `@unique` / `@@unique` → `<tablo>_<alan1>_<alan2>_key`. Sütunlarımız
 * camelCase olduğu için `_` güvenilir bir ayraç. Kurala uymayan elle
 * adlandırılmış indeksler (ör. `mesai_tek_acik_kayit`) için alan
 * bilinemiyor ve boş liste dönüyor — çağıran genel mesaja düşüyor.
 *
 * Eski sürümlerin `meta.target` biçimi ve son çare olarak hata metni de
 * deneniyor; hiçbiri tutmazsa genel mesaja düşüyoruz.
 */
export function cakisanAlanlar(error: object): string[] {
  const meta = (error as { meta?: Record<string, unknown> }).meta;

  // 1) Eski Prisma sürümleri / bazı sürücüler: meta.target
  const target = meta?.target;
  if (Array.isArray(target)) return target.map(String);
  if (typeof target === "string") return [target];

  // 2) Prisma 7 sürücü adaptörleri (pg ve sqlite): sürücü hatasının içinde
  const cause = (meta?.driverAdapterError as { cause?: unknown } | undefined)?.cause;
  const surucu = cause as
    | { constraint?: { fields?: unknown; index?: unknown }; table?: unknown }
    | undefined;
  const fields = surucu?.constraint?.fields;
  if (Array.isArray(fields)) return fields.map(String);

  // 2b) Prisma 7.10+: alan listesi yerine kısıt adı geliyor.
  const indeks = surucu?.constraint?.index;
  if (typeof indeks === "string") {
    return kisitAdindanAlanlar(indeks, surucu?.table);
  }

  // 3) Son çare: "Unique constraint failed on the fields: (`username`)"
  const message = (error as { message?: unknown }).message;
  if (typeof message === "string") {
    const eslesme = message.match(/fields:\s*\(([^)]+)\)/);
    if (eslesme) {
      return eslesme[1].split(",").map((f) => f.replace(/[`'"\s]/g, ""));
    }
    // 7.10+ metni: "Unique constraint failed on the constraint: `businesses_slug_key`"
    const kisit = message.match(/constraint:\s*`([^`]+)`/);
    if (kisit) return kisitAdindanAlanlar(kisit[1], undefined);
  }

  return [];
}

/**
 * `businesses_slug_key` → ["slug"], `shift_assignments_userId_date_key`
 * → ["userId", "date"].
 *
 * Tablo adı biliniyorsa önek olarak kesin biçimde atılıyor. Bilinmiyorsa
 * (yalnızca hata metninden gelindiğinde) tablo adı da `_` içerebildiği
 * için hangi parçanın tablo olduğu kesin değil; o durumda kuyruktaki
 * tüm parçalar aday olarak dönüyor. Aranan alan adı ("slug", "username")
 * tablo adının bir parçası olmadığı sürece sonuç değişmiyor — ve şemada
 * öyle bir tablo yok.
 */
function kisitAdindanAlanlar(indeks: string, tablo: unknown): string[] {
  if (!indeks.endsWith("_key")) return [];
  const govde = indeks.slice(0, -"_key".length);

  if (typeof tablo === "string" && tablo.length > 0) {
    if (!govde.startsWith(`${tablo}_`)) return [];
    return govde.slice(tablo.length + 1).split("_").filter(Boolean);
  }
  return govde.split("_").slice(1).filter(Boolean);
}

/**
 * Hata bir tekillik ihlaliyse çakışan alanların KISA adları ("username",
 * "googleSub"), değilse boş liste.
 *
 * `meta.target`a doğrudan bakan kod Prisma 7 + pg adaptöründe hiçbir
 * zaman alan bulamıyor (o alan hiç dolmuyor); çağıranlar bunu kullanmalı.
 */
export function tekillikAlanlari(error: unknown): string[] {
  if (typeof error !== "object" || error === null) return [];
  if ((error as { code?: unknown }).code !== "P2002") return [];
  return cakisanAlanlar(error).map((alan) => alan.split(".").pop() ?? alan);
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
