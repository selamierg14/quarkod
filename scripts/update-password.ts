import "dotenv/config";
import bcrypt from "bcryptjs";
import { createScriptClient } from "./prisma-client";

const username = process.argv[2];
const newPassword = process.argv[3];

if (!username || !newPassword) {
  console.error("Kullanım: npx tsx scripts/update-password.ts <username> <yeni_sifre>");
  process.exit(1);
}

async function main() {
  const prisma = createScriptClient();
  const passwordHash = await bcrypt.hash(newPassword, 10);
  const user = await prisma.user.update({
    where: { username },
    data: { passwordHash },
  });
  console.log(`✅ Güncellendi: ${user.username} (${user.role})`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
