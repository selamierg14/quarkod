import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
config({ path: ".env.local" }); config({ path: ".env" });
async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL }),
  });
  const k = await prisma.appUser.findUniqueOrThrow({ where: { username: "mobil-deneme" } });
  const rota = await prisma.rota.findFirstOrThrow({
    where: { aktif: true }, include: { duraklar: { include: { business: true }, take: 2 } },
  });
  for (const d of rota.duraklar) {
    await prisma.appVisit.create({
      data: { appUserId: k.id, businessId: d.businessId, mesafeMetre: 12 },
    });
  }
  console.log("ziyaret eklendi:", rota.ad, "->", rota.duraklar.map((d) => d.business.name).join(", "));
  await prisma.$disconnect();
}
main();
