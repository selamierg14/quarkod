import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
config({ path: ".env.local" }); config({ path: ".env" });
import { createSessionToken } from "../../src/lib/kimlik/session-token";
async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL }),
  });
  const biz = await prisma.business.findUniqueOrThrow({
    where: { id: "demo-biz-ada-kahvesi" }, select: { accountId: true, name: true },
  });
  const owner = await prisma.user.findFirstOrThrow({
    where: { accountId: biz.accountId, role: "owner", active: true },
  });
  console.log("owner:", owner.email, "| isletme:", biz.name);
  console.log(await createSessionToken({
    moduller: [], id: owner.id, name: owner.name, email: owner.email,
    role: "owner", accountId: owner.accountId, businessId: owner.businessId,
  }));
  await prisma.$disconnect();
}
main();
