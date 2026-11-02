import "dotenv/config";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { createScriptClient } from "./prisma-client";

/**
 * Biyerlere tarafını elle denemek için bir demo tüketici hesabı açar.
 *
 *   npm run demo:app-kullanici
 *
 * ŞİFRE HER ÇALIŞTIRMADA RASTGELE ve yalnızca konsola yazılıyor.
 * Önceden kodun içinde sabit bir şifre ("Demo1234!") duruyordu; bu iki
 * ayrı sorun demekti:
 *
 *   1. Şifre sürüm kontrolüne giriyordu — depoyu gören herkes biliyor.
 *   2. Bu proje geliştirme ve üretimde AYNI veritabanını kullanıyor.
 *      Yani betiği yerelde çalıştırmak, canlı sistemde herkesin bildiği
 *      bir parolayla açılmış bir hesap bırakıyordu.
 *
 * Kardeş betikler (demo-biyerlere.ts) zaten rastgele şifre üretiyor;
 * bu dosya o düzene getirildi.
 */

/** Okunabilir ama tahmin edilemez: 12 karakterlik rastgele parola. */
function sifreUret(): string {
  return `Bi${randomBytes(6).toString("base64url")}!`;
}

async function main() {
  // NODE_ENV koruması: kardeş betiklerdekiyle aynı (bkz.
  // demo-kullanicilar.ts). Paylaşılan veritabanı yüzünden TEK BAŞINA
  // yeterli değil — asıl koruma şifrenin rastgele olması.
  if (process.env.NODE_ENV === "production") {
    throw new Error("Bu betik üretimde çalıştırılamaz.");
  }

  const prisma = createScriptClient();

  try {
    const sifre = sifreUret();
    const passwordHash = await bcrypt.hash(sifre, 10);

    const user = await prisma.appUser.upsert({
      where: { username: "demo.kullanici" },
      create: {
        username: "demo.kullanici",
        name: "Demo Kullanıcı",
        passwordHash,
        // Şifre değiştiği an eski jetonlar düşsün.
        passwordChangedAt: new Date(),
        referralCode: "DEMO0001",
        plusUyeMi: false,
      },
      update: { passwordHash, passwordChangedAt: new Date() },
    });

    console.log("✅ App kullanıcısı hazır:");
    console.log("   Kullanıcı adı :", user.username);
    console.log("   Şifre         :", sifre);
    console.log("\n   Şifre bir daha gösterilmeyecek; gerekirse betiği tekrar çalıştırın.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
