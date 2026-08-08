import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

/** Komut satırı script'leri için Prisma istemcisi (src/lib/db.ts'in eşdeğeri). */
export function createScriptClient() {
  const raw = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const filePath = raw.startsWith("file:") ? raw.slice(5) : raw;
  const url = `file:${path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)}`;
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
}
