import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
config({ path: ".env.local" }); config({ path: ".env" });
import { createSessionToken } from "../../src/lib/kimlik/session-token";
async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL }),
  });
  const u = await prisma.user.findFirstOrThrow({ where: { email: "demo.platform@ornek.test" } });
  console.log(await createSessionToken({
    moduller: [], id: u.id, name: u.name, email: u.email,
    role: u.role as "superadmin", accountId: u.accountId, businessId: u.businessId,
  }));
  await prisma.$disconnect();
}
main();
