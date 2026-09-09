import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * DATABASE_URL doğrudan Postgres bağlantı dizesidir (postgres://kullanici:sifre@host:port/db).
 * SQLite'tan farkı: dosya yolu çözümlemeye gerek yok, adaptör URL'i olduğu
 * gibi alır. Yerel geliştirmede docker-compose'daki Postgres'i, preprod/prod'da
 * gerçek sunucuyu hedefler — kod hiç değişmez, yalnızca .env değişir.
 */
function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL tanımlı değil. .env dosyasına Postgres bağlantı dizesini yazın " +
        "(bkz. .env.example) ya da `docker compose up -d` ile yerel Postgres'i başlatın.",
    );
  }
  const adapter = new PrismaPg({
    connectionString: url,
    /**
     * Örnek başına havuz boyutu KÜÇÜK.
     *
     * `pg`'nin varsayılanı 10; serverless'te bu "her fonksiyon örneği 10
     * bağlantı" demek ve birkaç eşzamanlı örnek Neon'un limitini doldurmaya
     * yetiyor. Asıl çoğullama artık PgBouncer'da (DATABASE_URL pooler'a
     * bakıyor), uygulama tarafında geniş bir havuz tutmanın karşılığı yok.
     *
     * Uzun süre boşta kalan bağlantı da kapatılıyor: Neon boştaki hesabı
     * uykuya alıyor ve elde tutulan ölü bağlantı ilk istekte hataya
     * dönüşüyordu.
     */
    max: Number(process.env.DB_HAVUZ_BOYUTU ?? 5),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
