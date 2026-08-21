import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { slugCakismasiMi, slugIleOlustur, slugify } from "./slug";

/**
 * İşletme adresinin (slug) çakışmazlığı.
 *
 * Slug, karekodun içindeki yoldur: /f/<slug>/<masa>. İki işletmenin aynı
 * adresi alması, bir kafenin karekodunun başka bir kafenin anketini açması
 * demek olurdu. Bu dosyadaki bir kırmızı, tam olarak bu riski gösterir.
 */

let prisma: PrismaClient;
const schemaName = `test_slug_${randomBytes(6).toString("hex")}`;
const HESAP = "slug-testi-hesap";

beforeAll(async () => {
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error("DATABASE_URL tanımlı değil.");
  const url = new URL(base);
  url.searchParams.set("schema", schemaName);

  execFileSync("npx", ["prisma", "db", "push", `--url=${url.toString()}`], {
    stdio: "pipe",
  });
  prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: base }, { schema: schemaName }),
  });
  await prisma.account.create({ data: { id: HESAP, name: "Slug Testi" } });
});

afterAll(async () => {
  await prisma?.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
  await prisma?.$disconnect();
});

/** Verilen adla bir işletme açar ve aldığı adresi döndürür. */
function isletmeAc(ad: string) {
  return slugIleOlustur(ad, (slug) =>
    prisma.business.create({
      data: { accountId: HESAP, name: ad, slug, type: "yeme_icme" },
      select: { slug: true },
    }),
  );
}

describe("slugify", () => {
  it("Türkçe harfleri adres için sadeleştirir", () => {
    expect(slugify("Keskin Lezzetler")).toBe("keskin-lezzetler");
    expect(slugify("Çiğköfteci Ömer'in Yeri")).toBe("cigkofteci-omer-in-yeri");
    expect(slugify("  ŞİŞ & KEBAP  ")).toBe("sis-kebap");
  });

  it("adresten anlam çıkmayan girdide boş döner", () => {
    expect(slugify("!!! ???")).toBe("");
    expect(slugify("   ")).toBe("");
  });
});

describe("aynı adı yazan iki işletme", () => {
  it("ilk kaydolan sade adresi alır", async () => {
    const { slug } = await isletmeAc("Keskin Lezzetler");
    expect(slug).toBe("keskin-lezzetler");
  });

  it("ikincisi ayrı bir adres alır, kayıt düşmez", async () => {
    const { slug } = await isletmeAc("Keskin Lezzetler");
    expect(slug).not.toBe("keskin-lezzetler");
    expect(slug).toMatch(/^keskin-lezzetler-[0-9a-f]{6}$/);
  });

  it("aynı anda kaydolan on işletmenin hepsi ayrı adres alır", async () => {
    // Asıl sınav bu: "önce bak, sonra yaz" kontrolü burada çöküyordu —
    // onunun da kontrolü boş dönüp aynı adresi yazmaya çalışıyordu.
    const sonuclar = await Promise.all(
      Array.from({ length: 10 }, () => isletmeAc("Paralel Kafe")),
    );
    const adresler = sonuclar.map((s) => s.slug);
    expect(new Set(adresler).size).toBe(10);
    expect(adresler).toContain("paralel-kafe");
  });

  it("veritabanında hiçbir adres iki kez geçmez", async () => {
    const hepsi = await prisma.business.findMany({ select: { slug: true } });
    expect(new Set(hepsi.map((b) => b.slug)).size).toBe(hepsi.length);
    expect(hepsi.length).toBeGreaterThan(10);
  });

  it("adresten anlam çıkmıyorsa açıkça hata verir", async () => {
    await expect(isletmeAc("!!!")).rejects.toThrow(/adres üretilemedi/);
  });
});

describe("slugCakismasiMi", () => {
  it("yalnızca slug alanının benzersizlik ihlalini tanır", () => {
    // Prisma 7 + adapter-pg'nin canlı Postgres'te ürettiği gerçek biçim.
    expect(
      slugCakismasiMi({
        code: "P2002",
        meta: {
          modelName: "Business",
          driverAdapterError: {
            name: "DriverAdapterError",
            cause: {
              originalCode: "23505",
              kind: "UniqueConstraintViolation",
              constraint: { fields: ["slug"] },
            },
          },
        },
      }),
    ).toBe(true);
    // Eski sürümlerin biçimi de tanınmaya devam etsin.
    expect(slugCakismasiMi({ code: "P2002", meta: { target: ["slug"] } })).toBe(true);
    // E-posta çakışması slug'ın işi değil; yeniden denemek yerine yukarı
    // fırlamalı, yoksa kullanıcı "e-posta kayıtlı" uyarısını hiç görmez.
    expect(slugCakismasiMi({ code: "P2002", meta: { target: ["email"] } })).toBe(false);
    expect(slugCakismasiMi({ code: "P2025" })).toBe(false);
    expect(slugCakismasiMi(new Error("ağ hatası"))).toBe(false);
  });
});
