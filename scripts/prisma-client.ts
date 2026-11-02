import { PrismaClient } from "../src/generated/prisma/client";
import { baglantiAdaptoru } from "../src/lib/cekirdek/baglanti";

/**
 * Komut satırı betikleri için Prisma istemcisi.
 *
 * Bağlantı ayarları uygulamayla ORTAK (lib/cekirdek/baglanti.ts). Önceden
 * burada hiçbir ayar yoktu, yani `pg` varsayılanı geçerliydi: 10 bağlantı,
 * boşta kalma sınırı yok, bağlantı zaman aşımı yok.
 *
 * Bu, uygulamanın İKİ KATI bağlantı demekti — üstelik aynı üretim
 * veritabanına, çünkü bu projede geliştirme ve üretim aynı örneği
 * paylaşıyor. Yerelde çalıştırılan bir tohumlama betiği, canlı isteklerin
 * bağlantı bulamamasına yol açabiliyordu.
 *
 * Betik havuzu bilerek daha da küçük: betikler işi sırayla yapıyor,
 * geniş havuz onlara hız kazandırmıyor.
 */
export function createScriptClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL tanımlı değil. .env dosyasını kontrol edin.");
  }
  return new PrismaClient({ adapter: baglantiAdaptoru(url, { betik: true }) });
}
