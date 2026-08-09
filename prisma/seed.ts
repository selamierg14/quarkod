import path from "node:path";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEFAULT_CATEGORIES, type BusinessType } from "../src/lib/constants";

const raw = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const filePath = raw.startsWith("file:") ? raw.slice(5) : raw;
const url = `file:${path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)}`;

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

/// Örnek hesapların 2FA kodlarının gideceği numara.
const TEST_PHONE = "+905364901001";

type BusinessSeed = {
  slug: string;
  name: string;
  type: BusinessType;
  address: string;
  googleReviewUrl: string;
  brandColor: string;
  notifyThreshold: number;
  /** Masa numaraları; gece kulübünde kapı QR'ı için isEntrance kullanılır. */
  tables: { number: string; isEntrance?: boolean }[];
  manager: { name: string; email: string; username: string };
};

const BUSINESSES: BusinessSeed[] = [
  {
    slug: "keskinlezzetler",
    name: "KESKİNLEZZETLER",
    type: "yeme_icme",
    address: "Merkez şube",
    googleReviewUrl: "https://search.google.com/local/writereview?placeid=DEGISTIRIN",
    brandColor: "#b91c1c",
    notifyThreshold: 3,
    tables: Array.from({ length: 12 }, (_, i) => ({ number: String(i + 1) })),
    manager: { name: "Keskin Lezzetler Sorumlusu", email: "keskin@ornek.com", username: "keskin" },
  },
  {
    slug: "ege-cunda-balik",
    name: "Ege Cunda Balık",
    type: "balikci",
    address: "Cunda",
    googleReviewUrl: "https://search.google.com/local/writereview?placeid=DEGISTIRIN",
    brandColor: "#0e7490",
    notifyThreshold: 3,
    tables: Array.from({ length: 20 }, (_, i) => ({ number: String(i + 1) })),
    manager: { name: "Ege Cunda Sorumlusu", email: "egecunda@ornek.com", username: "egecunda" },
  },
  {
    slug: "sahne-marin",
    name: "Sahne Marin",
    type: "gece_kulubu",
    address: "Marina",
    googleReviewUrl: "https://search.google.com/local/writereview?placeid=DEGISTIRIN",
    brandColor: "#7c3aed",
    notifyThreshold: 3,
    // Gece kulübünde hem kapı QR'ı hem VIP masa QR'ları.
    tables: [
      { number: "GIRIS", isEntrance: true },
      ...Array.from({ length: 8 }, (_, i) => ({ number: `VIP-${i + 1}` })),
    ],
    manager: { name: "Sahne Marin Sorumlusu", email: "sahnemarin@ornek.com", username: "sahnemarin" },
  },
];

async function main() {
  const password = await bcrypt.hash("degistir123", 10);

  // Örnek veri tek bir kiracıya aittir; göç sırasında oluşturulan hesabı
  // yeniden kullanıyoruz ki tekrar çalıştırıldığında kopya hesap açılmasın.
  const account = await prisma.account.upsert({
    where: { id: "acct_varsayilan" },
    update: {},
    create: {
      id: "acct_varsayilan",
      name: "Varsayılan Hesap",
      email: "patron@ornek.com",
    },
  });

  for (const seed of BUSINESSES) {
    const business = await prisma.business.upsert({
      where: { slug: seed.slug },
      update: {
        name: seed.name,
        type: seed.type,
        address: seed.address,
        brandColor: seed.brandColor,
        notifyThreshold: seed.notifyThreshold,
      },
      create: {
        accountId: account.id,
        slug: seed.slug,
        name: seed.name,
        type: seed.type,
        address: seed.address,
        googleReviewUrl: seed.googleReviewUrl,
        brandColor: seed.brandColor,
        notifyThreshold: seed.notifyThreshold,
      },
    });

    const categories = DEFAULT_CATEGORIES[seed.type];
    for (const [index, name] of categories.entries()) {
      await prisma.categoryTemplate.upsert({
        where: { businessId_name: { businessId: business.id, name } },
        update: { sortOrder: index },
        create: { businessId: business.id, name, sortOrder: index },
      });
    }

    for (const table of seed.tables) {
      await prisma.table.upsert({
        where: {
          businessId_tableNumber: {
            businessId: business.id,
            tableNumber: table.number,
          },
        },
        update: { isEntrance: table.isEntrance ?? false },
        create: {
          businessId: business.id,
          tableNumber: table.number,
          isEntrance: table.isEntrance ?? false,
          qrToken: randomBytes(9).toString("base64url"),
        },
      });
    }

    await prisma.user.upsert({
      where: { email: seed.manager.email },
      update: { businessId: business.id, accountId: account.id, phone: TEST_PHONE },
      create: {
        accountId: account.id,
        name: seed.manager.name,
        username: seed.manager.username,
        email: seed.manager.email,
        phone: TEST_PHONE,
        passwordHash: password,
        role: "manager",
        businessId: business.id,
      },
    });
  }

  await prisma.user.upsert({
    where: { email: "patron@ornek.com" },
    update: { accountId: account.id, phone: TEST_PHONE },
    create: {
      accountId: account.id,
      name: "Patron",
      username: "patron",
      email: "patron@ornek.com",
      phone: TEST_PHONE,
      passwordHash: password,
      role: "owner",
      businessId: null,
    },
  });

  // Platform yöneticisi hiçbir hesaba ait değildir; hesapları o açar/askıya alır.
  await prisma.user.upsert({
    where: { email: "platform@ornek.com" },
    update: { phone: TEST_PHONE },
    create: {
      accountId: null,
      name: "Platform Yöneticisi",
      username: "platform",
      email: "platform@ornek.com",
      phone: TEST_PHONE,
      passwordHash: password,
      role: "superadmin",
      businessId: null,
    },
  });

  console.log("Seed tamamlandı.");
  console.log("  Giriş kullanıcı adı ile yapılır; kod " + TEST_PHONE + " numarasına gider.");
  console.log("  Platform:  platform / degistir123");
  console.log("  Patron:    patron / degistir123");
  for (const b of BUSINESSES) {
    console.log(`  ${b.name}: ${b.manager.username} / degistir123`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
