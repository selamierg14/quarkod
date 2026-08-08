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
  manager: { name: string; email: string };
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
    manager: { name: "Keskin Lezzetler Sorumlusu", email: "keskin@ornek.com" },
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
    manager: { name: "Ege Cunda Sorumlusu", email: "egecunda@ornek.com" },
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
    manager: { name: "Sahne Marin Sorumlusu", email: "sahnemarin@ornek.com" },
  },
];

async function main() {
  const password = await bcrypt.hash("degistir123", 10);

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
      update: { businessId: business.id },
      create: {
        name: seed.manager.name,
        email: seed.manager.email,
        passwordHash: password,
        role: "manager",
        businessId: business.id,
      },
    });
  }

  await prisma.user.upsert({
    where: { email: "patron@ornek.com" },
    update: {},
    create: {
      name: "Patron",
      email: "patron@ornek.com",
      passwordHash: password,
      role: "owner",
      businessId: null,
    },
  });

  console.log("Seed tamamlandı.");
  console.log("  Patron:    patron@ornek.com / degistir123");
  for (const b of BUSINESSES) {
    console.log(`  ${b.name}: ${b.manager.email} / degistir123`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
