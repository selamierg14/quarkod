import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { config } from "dotenv";
config({ path: ".env.local" }); config({ path: ".env" });
async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL }),
  });
  const k = await prisma.appUser.upsert({
    where: { username: "mobil-ikinci" },
    update: { passwordHash: await bcrypt.hash("MobilTest123", 10), active: true },
    create: { username: "mobil-ikinci", passwordHash: await bcrypt.hash("MobilTest123", 10),
      name: "İkinci Kullanıcı", referralCode: "IKI" + Math.floor(Math.random()*90000+10000) },
  });
  console.log("ikinci kullanici:", k.username);
  await prisma.$disconnect();
}
main();
