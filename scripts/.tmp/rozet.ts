import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
config({ path: ".env.local" }); config({ path: ".env" });
async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL }),
  });
  const k = await prisma.appUser.findUniqueOrThrow({ where: { username: "mobil-deneme" } });
  await prisma.appBadge.deleteMany({ where: { appUserId: k.id } });
  await prisma.appBadge.create({ data: { appUserId: k.id, rozet: "ilkAdim" } });
  const say = await prisma.appBadge.count({ where: { appUserId: k.id } });
  console.log("rozet eklendi, toplam:", say);
  await prisma.$disconnect();
}
main();
