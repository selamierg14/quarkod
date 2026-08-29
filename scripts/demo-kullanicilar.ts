import "dotenv/config";
import bcrypt from "bcryptjs";
import { createScriptClient } from "./prisma-client";



const SIFRE = "Deneme1234";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Bu betik üretimde çalıştırılamaz.");
  }

  const prisma = createScriptClient();
  const passwordHash = await bcrypt.hash(SIFRE, 10);

  // En çok işletmesi olan hesabı seçiyoruz: bölge müdürünün "bazılarını
  // görür" davranışı ancak birden fazla işletme varken anlamlı.
  const hesap = await prisma.account.findFirst({
    where: { businesses: { some: {} } },
    include: { businesses: { orderBy: { createdAt: "asc" } } },
  });
  if (!hesap) throw new Error("İşletmesi olan bir hesap yok. Önce npm run setup çalıştırın.");

  const isletmeler = hesap.businesses;

  const tanimlar = [
    {
      username: "demo.platform",
      name: "Demo Platform Yöneticisi",
      role: "superadmin",
      accountId: null as string | null,
      businessId: null as string | null,
      bolge: [] as string[],
      aciklama: "Tüm hesaplar; kiracı ekranlarını hesaba girmeden görmez.",
    },
    {
      username: "demo.patron",
      name: "Demo Patron",
      role: "owner",
      accountId: hesap.id,
      businessId: null,
      bolge: [],
      aciklama: `${hesap.name} hesabının tamamı.`,
    },
    {
      username: "demo.bolge",
      name: "Demo Bölge Müdürü",
      role: "bolge",
      accountId: hesap.id,
      businessId: null,
      // İlk iki işletme: "hepsini değil, bazılarını görüyor" farkı görünsün.
      bolge: isletmeler.slice(0, 2).map((b) => b.id),
      aciklama: isletmeler
        .slice(0, 2)
        .map((b) => b.name)
        .join(" + "),
    },
    {
      username: "demo.sorumlu",
      name: "Demo İşletme Sorumlusu",
      role: "manager",
      accountId: hesap.id,
      businessId: isletmeler[0]?.id ?? null,
      bolge: [],
      aciklama: isletmeler[0]?.name ?? "—",
    },
  ];

  for (const t of tanimlar) {
    const mevcut = await prisma.user.findUnique({ where: { username: t.username } });

    const veri = {
      name: t.name,
      email: `${t.username}@ornek.test`,
      phone: "+905321112233",
      role: t.role,
      accountId: t.accountId,
      businessId: t.businessId,
      passwordHash,
      active: true,
      passwordChangedAt: new Date(),
    };

    const kullanici = mevcut
      ? await prisma.user.update({ where: { id: mevcut.id }, data: veri })
      : await prisma.user.create({ data: { ...veri, username: t.username } });

    // Bölge atamaları her çalıştırmada baştan kuruluyor: işletme listesi
    // değişmişse eski atama ortada kalmasın.
    await prisma.userBusiness.deleteMany({ where: { userId: kullanici.id } });
    if (t.bolge.length > 0) {
      await prisma.userBusiness.createMany({
        data: t.bolge.map((businessId) => ({ userId: kullanici.id, businessId })),
      });
    }

    console.log(`${t.username.padEnd(15)} ${t.role.padEnd(11)} ${t.aciklama}`);
  }

  console.log(`\nHesap: ${hesap.name}`);
  console.log(`Şifre (hepsi): ${SIFRE}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
