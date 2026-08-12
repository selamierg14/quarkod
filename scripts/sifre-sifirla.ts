import "dotenv/config";
import bcrypt from "bcryptjs";
import { createScriptClient } from "./prisma-client";

/**
 * Bir kullanıcının şifresini komut satırından sıfırlar.
 *
 * Platform yöneticisinin şifresi unutulduğunda paneli açacak kimse kalmıyor;
 * SMS sıfırlama da SMS sağlayıcısı ayakta değilse işe yaramıyor. Bu betik
 * sunucuya erişebilen kişinin son çaresi — o yüzden yalnızca elle,
 * bilinçli olarak çalıştırılacak şekilde duruyor.
 *
 * Kullanım: npm run sifre:sifirla -- <kullaniciAdi> <yeniSifre>
 */
async function main() {
  const [username, password] = process.argv.slice(2);

  if (!username || !password) {
    console.error("Kullanım: npm run sifre:sifirla -- <kullaniciAdi> <yeniSifre>");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Şifre en az 8 karakter olmalı.");
    process.exit(1);
  }

  const prisma = createScriptClient();
  const user = await prisma.user.findUnique({
    where: { username: username.trim().toLowerCase() },
    select: { id: true, name: true, username: true, role: true },
  });

  if (!user) {
    console.error(`"${username}" kullanıcısı bulunamadı.`);
    await prisma.$disconnect();
    process.exit(1);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(password, 10),
      active: true,
      // Bu andan önce üretilmiş oturum jetonları geçersiz sayılır; şifre
      // değiştiyse açık kalan cihazlar da düşmeli.
      passwordChangedAt: new Date(),
    },
  });

  console.log(`${user.name} (${user.username} · ${user.role}) şifresi güncellendi.`);
  console.log("Açık oturumları kapatıldı, yeniden giriş yapması gerekiyor.");
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
