import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Postgres bağlantı adaptörünün TEK yapılandırması.
 *
 * Neden ayrı bir dosya: bu ayarlar iki yerde kuruluyordu — uygulama için
 * `lib/cekirdek/db.ts`, komut satırı betikleri için
 * `scripts/prisma-client.ts` — ve ikisi AYNI değildi. Betik tarafında ne
 * havuz sınırı, ne boşta kalma zaman aşımı, ne bağlantı zaman aşımı vardı;
 * yani `pg`'nin varsayılanı (10 bağlantı) geçerliydi.
 *
 * Bu, ikinci bir yapılandırma değil bir KAZAYDI ve sonucu şuydu: bakım
 * betikleri uygulamanın iki katı bağlantı açıyor, üstelik aynı üretim
 * veritabanına. Neon'un bağlantı limiti paylaşıldığı için yerelde
 * çalıştırılan bir tohumlama betiği, canlı isteklerin bağlantı bulamamasına
 * yol açabiliyordu.
 *
 * Ayarların gerekçeleri:
 *
 * - `max` KÜÇÜK: asıl çoğullama PgBouncer'da (DATABASE_URL pooler'a
 *   bakıyor). Uygulama tarafında geniş havuz tutmanın karşılığı yok ve
 *   serverless'te her örnek kendi havuzunu açtığı için limit hızla doluyor.
 * - `idleTimeoutMillis`: Neon boştaki hesabı uykuya alıyor; elde tutulan
 *   ölü bağlantı ilk istekte hataya dönüşüyordu.
 * - `connectionTimeoutMillis`: bağlantı beklemesi sonsuza kadar sürmesin —
 *   düşen bir veritabanında istek asılı kalmaktansa hata versin.
 */

/** Uygulama (istek yolu) için havuz boyutu. */
const VARSAYILAN_HAVUZ = 5;

/**
 * Betikler için havuz boyutu — bilerek daha da küçük.
 *
 * Betikler tek bir işi sırayla yapıyor; eşzamanlılıkları yok. Geniş havuz
 * onlara hız kazandırmıyor, yalnızca canlı isteklerden bağlantı çalıyor.
 */
const BETIK_HAVUZU = 2;

export function baglantiAdaptoru(
  url: string,
  { betik = false }: { betik?: boolean } = {},
): PrismaPg {
  return new PrismaPg({
    connectionString: url,
    max: betik
      ? BETIK_HAVUZU
      : Number(process.env.DB_HAVUZ_BOYUTU ?? VARSAYILAN_HAVUZ),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}
