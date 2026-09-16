import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { config } from "dotenv";
config({ path: ".env.local" }); config({ path: ".env" });
async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL }),
  });
  const hash = await bcrypt.hash("MobilTest123", 10);
  const k = await prisma.appUser.upsert({
    where: { username: "mobil-deneme" },
    update: { passwordHash: hash, active: true },
    create: { username: "mobil-deneme", passwordHash: hash, name: "Mobil Deneme",
      referralCode: "MBL" + Math.floor(Math.random()*90000+10000) },
  });
  // Ziyaret geçmişi ekranı için birkaç ziyaret.
  const mekanlar = await prisma.business.findMany({ take: 3, select: { id: true, name: true } });
  await prisma.appVisit.deleteMany({ where: { appUserId: k.id } });
  let gun = 0;
  for (const m of mekanlar) {
    await prisma.appVisit.create({
      data: { appUserId: k.id, businessId: m.id, mesafeMetre: 25, createdAt: new Date(Date.now() - gun * 86400000) },
    });
    gun += 2;
  }
  console.log("hazir:", k.username, "| ziyaret:", mekanlar.map((m) => m.name).join(", "));
  await prisma.$disconnect();
}
main();
