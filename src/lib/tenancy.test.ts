import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { buildFeedbackWhere } from "./feedback-filters";
import { yazabilirMi } from "./session-token";
import {
  IMPOSSIBLE_ID,
  allowedBusinessIdsFor,
  canAccessBusinessFor,
  userScopeFor,
  type TenantScope,
} from "./tenancy";

/**
 * Kiracı izolasyonunun uçtan uca sınavı: gerçek bir veritabanında iki hesap
 * kurup, birinin diğerine hiçbir yoldan ulaşamadığını doğruluyoruz.
 *
 * Bu dosyadaki bir kırmızı, doğrudan "müşteri A, müşteri B'nin verisini
 * görüyor" demektir.
 */

let prisma: PrismaClient;
let schemaUrl: string;
const schemaName = `test_tenancy_${randomBytes(6).toString("hex")}`;

// A hesabı: iki işletme. B hesabı: bir işletme.
const ids = {
  hesapA: "hesap-a",
  hesapB: "hesap-b",
  aKafe1: "a-kafe-1",
  aKafe2: "a-kafe-2",
  bKafe1: "b-kafe-1",
};

const sahipA: TenantScope = {
  role: "owner",
  accountId: ids.hesapA,
  businessId: null,
};
const sahipB: TenantScope = {
  role: "owner",
  accountId: ids.hesapB,
  businessId: null,
};
const sorumluA1: TenantScope = {
  role: "manager",
  accountId: ids.hesapA,
  businessId: ids.aKafe1,
};
const platform: TenantScope = {
  role: "superadmin",
  accountId: null,
  businessId: null,
};
// A hesabında yalnızca "A Merkez"e bakan bölge müdürü.
const bolgeA: TenantScope = {
  role: "bolge",
  accountId: ids.hesapA,
  businessId: null,
  userId: "bolge-a",
};
// A hesabının tamamını görebilen ama hiçbir şeyi değiştiremeyen kullanıcı.
const okuyucuA: TenantScope = {
  role: "viewer",
  accountId: ids.hesapA,
  businessId: null,
  userId: "okuyucu-a",
};

beforeAll(async () => {
  const base = process.env.DATABASE_URL;
  if (!base) {
    throw new Error(
      "DATABASE_URL tanımlı değil. Testler de aynı Postgres'i kullanır " +
        "(docker compose up -d ile yerel Postgres'i başlatın).",
    );
  }
  // Rastgele bir Postgres şeması (namespace): geliştirme verisine dokunmadan
  // izole bir alanda tablo kurup testleri koşuyoruz, sonunda şemayı düşürüyoruz.
  const url = new URL(base);
  url.searchParams.set("schema", schemaName);
  schemaUrl = url.toString();

  execFileSync("npx", ["prisma", "db", "push", `--url=${schemaUrl}`], {
    stdio: "pipe",
  });

  // `@prisma/adapter-pg` URL'deki "?schema=" parametresini kendiliğinden
  // okumuyor (bu yalnızca CLI'nin migrate/push komutlarında geçerli) — çalışma
  // zamanında hangi şemayı kullanacağını ikinci argümandan öğreniyor. Bunu
  // atlarsak client sessizce "public" şemaya, yani gerçek geliştirme
  // verisine bağlanır.
  prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: base }, { schema: schemaName }),
  });

  await prisma.account.create({ data: { id: ids.hesapA, name: "A Kafe Zinciri" } });
  await prisma.account.create({ data: { id: ids.hesapB, name: "B Kafe" } });

  for (const [id, accountId, name] of [
    [ids.aKafe1, ids.hesapA, "A Merkez"],
    [ids.aKafe2, ids.hesapA, "A Şube"],
    [ids.bKafe1, ids.hesapB, "B Merkez"],
  ] as const) {
    await prisma.business.create({
      data: { id, accountId, name, slug: id, type: "yeme_icme" },
    });
  }
  // Bölge müdürü: A hesabında yalnızca bir işletmeye atanmış. B hesabının
  // işletmesine yapılmış hatalı bir atama da ekleniyor — hesap filtresinin
  // bunu elemesi gerekiyor.
  await prisma.user.create({
    data: {
      id: "bolge-a",
      accountId: ids.hesapA,
      name: "Bölge Müdürü",
      username: "bolge-a",
      email: "bolge@a.test",
      role: "bolge",
      passwordHash: "x",
      businesses: {
        create: [{ businessId: ids.aKafe1 }, { businessId: ids.bKafe1 }],
      },
    },
  });
}, 120000);

afterAll(async () => {
  // Şemayı düşür, sonra bağlantıyı kapat — sırayı değiştirirsek düşürme
  // isteği kapanmış bağlantıdan gider.
  await prisma?.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
  await prisma?.$disconnect();
});

describe("hesap sahibinin kapsamı", () => {
  it("yalnızca kendi hesabının işletmelerini görür", async () => {
    const a = await allowedBusinessIdsFor(prisma, sahipA);
    expect(a.sort()).toEqual([ids.aKafe1, ids.aKafe2].sort());

    const b = await allowedBusinessIdsFor(prisma, sahipB);
    expect(b).toEqual([ids.bKafe1]);
  });

  it("diğer hesabın işletmesine erişemez", async () => {
    expect(await canAccessBusinessFor(prisma, sahipA, ids.bKafe1)).toBe(false);
    expect(await canAccessBusinessFor(prisma, sahipB, ids.aKafe1)).toBe(false);
  });

  it("kendi işletmesine erişir", async () => {
    expect(await canAccessBusinessFor(prisma, sahipA, ids.aKafe2)).toBe(true);
  });
});

describe("işletme sorumlusunun kapsamı", () => {
  it("yalnızca kendi işletmesini görür — aynı hesaptaki diğerini bile değil", async () => {
    expect(await allowedBusinessIdsFor(prisma, sorumluA1)).toEqual([ids.aKafe1]);
    expect(await canAccessBusinessFor(prisma, sorumluA1, ids.aKafe2)).toBe(false);
  });

  it("başka hesabın işletmesine erişemez", async () => {
    expect(await canAccessBusinessFor(prisma, sorumluA1, ids.bKafe1)).toBe(false);
  });
});

describe("platform yöneticisi", () => {
  it("tüm hesapların işletmelerini görür", async () => {
    const hepsi = await allowedBusinessIdsFor(prisma, platform);
    expect(hepsi.sort()).toEqual([ids.aKafe1, ids.aKafe2, ids.bKafe1].sort());
  });
});

describe("bozuk kapsam güvenli tarafa düşer", () => {
  it("hesabı olmayan owner hiçbir işletme görmez", async () => {
    const ids2 = await allowedBusinessIdsFor(prisma, {
      role: "owner",
      accountId: null,
      businessId: null,
    });
    expect(ids2).toEqual([IMPOSSIBLE_ID]);
  });

  it("işletmesi olmayan manager hiçbir işletme görmez", async () => {
    const ids2 = await allowedBusinessIdsFor(prisma, {
      role: "manager",
      accountId: ids.hesapA,
      businessId: null,
    });
    expect(ids2).toEqual([IMPOSSIBLE_ID]);
  });

  it("olmayan işletme kimliği erişim vermez", async () => {
    expect(await canAccessBusinessFor(prisma, sahipA, "yok-boyle-bir-sey")).toBe(false);
    expect(await canAccessBusinessFor(prisma, sahipA, "")).toBe(false);
  });
});

describe("kullanıcı kapsamı", () => {
  it("hesabına göre filtreler, superadmin için serbest", () => {
    expect(userScopeFor(sahipA)).toEqual({ accountId: ids.hesapA });
    expect(userScopeFor(platform)).toEqual({});
  });
});

describe("geri bildirim filtresi kapsamı aşamaz", () => {
  it("B'nin işletmesi istense de A'nın kapsamı korunur", async () => {
    const izinli = await allowedBusinessIdsFor(prisma, sahipA);
    const where = buildFeedbackWhere({ isletme: ids.bKafe1 }, izinli);
    // Adres çubuğuna B'nin kimliği yazılsa bile kapsam A'da kalır.
    expect(where.businessId).toEqual({ in: izinli });
  });

  it("gerçek veriyle doğrulama: A'nın sorgusu B'nin kaydını getirmez", async () => {
    await prisma.feedback.create({
      data: { businessId: ids.bKafe1, overallRating: 1, comment: "B gizli yorum" },
    });

    const izinli = await allowedBusinessIdsFor(prisma, sahipA);
    const sonuc = await prisma.feedback.findMany({
      where: buildFeedbackWhere({}, izinli),
    });

    expect(sonuc).toHaveLength(0);
  });
});

/**
 * Menü ve ürün puanları da kiracıya bağlı.
 *
 * Buradaki bir kırmızı, bir kafenin menüsünün ya da ürün puanlarının başka
 * bir müşteriye görünmesi demektir.
 */
describe("menü ve ürün puanları hesaba bağlı", () => {
  beforeAll(async () => {
    for (const [id, businessId, ad] of [
      ["kat-a", ids.aKafe1, "A Kahveler"],
      ["kat-b", ids.bKafe1, "B Kahveler"],
    ] as const) {
      await prisma.menuCategory.create({ data: { id, businessId, name: ad } });
    }

    await prisma.menuItem.create({
      data: { id: "urun-a", businessId: ids.aKafe1, categoryId: "kat-a", name: "A Latte" },
    });
    await prisma.menuItem.create({
      data: { id: "urun-b", businessId: ids.bKafe1, categoryId: "kat-b", name: "B Latte" },
    });

    for (const [businessId, menuItemId, itemName] of [
      [ids.aKafe1, "urun-a", "A Latte"],
      [ids.bKafe1, "urun-b", "B Latte"],
    ] as const) {
      const feedback = await prisma.feedback.create({
        data: { businessId, overallRating: 4 },
      });
      await prisma.itemRating.create({
        data: { feedbackId: feedback.id, businessId, menuItemId, itemName, rating: 4 },
      });
    }
  });

  it("sahip yalnızca kendi hesabının menüsünü görür", async () => {
    const izinli = await allowedBusinessIdsFor(prisma, sahipA);
    const urunler = await prisma.menuItem.findMany({
      where: { businessId: { in: izinli } },
      select: { name: true },
    });
    expect(urunler.map((u) => u.name)).toEqual(["A Latte"]);
  });

  it("sahip yalnızca kendi hesabının ürün puanlarını görür", async () => {
    const izinli = await allowedBusinessIdsFor(prisma, sahipB);
    const puanlar = await prisma.itemRating.findMany({
      where: { businessId: { in: izinli } },
      select: { itemName: true },
    });
    expect(puanlar.map((p) => p.itemName)).toEqual(["B Latte"]);
  });

  it("başka hesabın ürününe puan yazılamaz — kapsam kontrolü ürün sahipliğine bakar", async () => {
    // submitFeedback, gelen ürün kimliklerini businessId ile birlikte
    // sorguluyor. Yanlış işletmenin ürünü verilirse hiç eşleşme dönmemeli.
    const eslesen = await prisma.menuItem.findMany({
      where: { id: { in: ["urun-b"] }, businessId: ids.aKafe1 },
    });
    expect(eslesen).toEqual([]);
  });

  it("ürün silinince puan kaydı kalır, bağ kopar", async () => {
    // Rapor geçmişi ürünle birlikte silinmemeli; ad kayda kopyalandığı için
    // "A Latte" satırı okunur kalır.
    await prisma.menuItem.delete({ where: { id: "urun-a" } });
    const kalan = await prisma.itemRating.findFirst({
      where: { businessId: ids.aKafe1 },
      select: { itemName: true, menuItemId: true },
    });
    expect(kalan).toEqual({ itemName: "A Latte", menuItemId: null });
  });
});

describe("bölge müdürü", () => {
  it("yalnızca atandığı işletmeleri görür", async () => {
    const izinli = await allowedBusinessIdsFor(prisma, bolgeA);
    expect(izinli).toEqual([ids.aKafe1]);
  });

  it("aynı hesaptaki atanmamış işletmeye erişemez", async () => {
    expect(await canAccessBusinessFor(prisma, bolgeA, ids.aKafe2)).toBe(false);
  });

  it("başka hesaba yapılmış hatalı atama kapsama girmez", async () => {
    // Atama tablosunda B işletmesi de var; hesap filtresi onu elemeli.
    const izinli = await allowedBusinessIdsFor(prisma, bolgeA);
    expect(izinli).not.toContain(ids.bKafe1);
    expect(await canAccessBusinessFor(prisma, bolgeA, ids.bKafe1)).toBe(false);
  });

  it("hiç atama yoksa hiçbir şey görmez", async () => {
    const bos = await allowedBusinessIdsFor(prisma, {
      role: "bolge",
      accountId: ids.hesapA,
      businessId: null,
      userId: "olmayan-kullanici",
    });
    expect(bos).toEqual([IMPOSSIBLE_ID]);
  });
});

describe("salt okunur kullanıcı", () => {
  it("hesabın tamamını görür", async () => {
    const izinli = await allowedBusinessIdsFor(prisma, okuyucuA);
    expect(izinli.sort()).toEqual([ids.aKafe1, ids.aKafe2].sort());
  });

  it("başka hesabın işletmesine erişemez", async () => {
    expect(await canAccessBusinessFor(prisma, okuyucuA, ids.bKafe1)).toBe(false);
  });

  it("yazma yetkisi yoktur", () => {
    expect(yazabilirMi("viewer")).toBe(false);
    expect(yazabilirMi("owner")).toBe(true);
    expect(yazabilirMi("bolge")).toBe(true);
  });
});
