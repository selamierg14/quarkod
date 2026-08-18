import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/** Komut satırı script'leri için Prisma istemcisi (src/lib/db.ts'in eşdeğeri). */
export function createScriptClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL tanımlı değil. .env dosyasını kontrol edin.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}
