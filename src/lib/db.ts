import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * SQLite dosya yolu proje köküne göre çözülür; böylece `next dev`, `next start`
 * ve seed script'i aynı veritabanını görür.
 */
function resolveDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const filePath = raw.startsWith("file:") ? raw.slice("file:".length) : raw;
  if (path.isAbsolute(filePath)) return filePath;
  // Yol çalışma zamanında çözülür; derleyicinin tüm projeyi izlemesine gerek yok.
  return path.join(/* turbopackIgnore: true */ process.cwd(), filePath);
}

function createClient() {
  const adapter = new PrismaBetterSqlite3({ url: `file:${resolveDatabaseUrl()}` });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
