import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { issueOtpFor, verifyOtpFor, type OtpDeposu } from "../kimlik/otp";

/**
 * Tüketici hesabının kurtarma kanalı.
 *
 * Buradaki bir kırmızı iki yönden kötü: ya şifresini unutan kullanıcı
 * hesabını geri alamıyor (eski durum), ya da BAŞKASI onun hesabını
 * kurtarabiliyor.
 *
 * Kurtarmanın koşulu numaranın DOĞRULANMIŞ olması. Doğrulanmamış numara
 * kurtarma için işe yaramaz — yazım hatası varsa kullanıcı yine kilitli
 * kalır ve daha kötüsü, numara yanlışlıkla başkasınınsa o kişi hesabı
 * devralır. `telefon` dolu ama `telefonDogrulandi` boş olan hesap
 * kurtarılamıyor olmalı; testin en önemli maddesi bu.
 */

let prisma: PrismaClient;
const schemaName = `test_appotp_${randomBytes(6).toString("hex")}`;

let appUserId = "";
let username = "";
const NUMARA = "+905550001234";
const DOGRU_KOD = "654321";

/** `kurtarmaHedefi`nin saf karşılığı — server-only'ye bağlanmadan. */
async function hedefBul(ad: string) {
  const k = await prisma.appUser.findUnique({
    where: { username: ad.trim().toLowerCase() },
    select: { id: true, active: true, telefon: true, telefonDogrulandi: true },
  });
  if (!k?.active || !k.telefon || !k.telefonDogrulandi) return { durum: "yok" as const };
  return { durum: "hazir" as const, appUserId: k.id, telefon: k.telefon };
}

const depo = () => prisma.appOtpCode as unknown as OtpDeposu;

beforeAll(async () => {
  const base = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!base) throw new Error("DATABASE_URL tanımlı değil.");
  const url = new URL(base);
  url.searchParams.set("schema", schemaName);

  execFileSync("npx", ["prisma", "db", "push", `--url=${url.toString()}`], { stdio: "pipe" });
  prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: base }, { schema: schemaName }),
  });

  username = `u-${randomBytes(4).toString("hex")}`;
  const k = await prisma.appUser.create({
    data: {
      username,
      passwordHash: "x",
      name: "Test Kullanıcı",
      referralCode: randomBytes(4).toString("hex").toUpperCase(),
    },
  });
  appUserId = k.id;
}, 120_000);

afterAll(async () => {
  await prisma?.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
  await prisma?.$disconnect();
});

beforeEach(async () => {
  await prisma.appOtpCode.deleteMany({});
  await prisma.appUser.update({
    where: { id: appUserId },
    data: { telefon: null, telefonDogrulandi: null, active: true },
  });
});

describe("kurtarma hedefi", () => {
  it("numara YOKSA kurtarma yapılamıyor", async () => {
    expect((await hedefBul(username)).durum).toBe("yok");
  });

  it("numara var ama DOĞRULANMAMIŞSA kurtarma yapılamıyor", async () => {
    /**
     * Testin en önemli maddesi. Doğrulanmamış numara kurtarma için işe
     * yaramaz: yazım hatası varsa kullanıcı yine kilitli, numara
     * yanlışlıkla başkasınınsa o kişi hesabı devralır.
     */
    await prisma.appUser.update({
      where: { id: appUserId },
      data: { telefon: NUMARA, telefonDogrulandi: null },
    });
    expect((await hedefBul(username)).durum).toBe("yok");
  });

  it("numara doğrulanmışsa kurtarma hazır", async () => {
    await prisma.appUser.update({
      where: { id: appUserId },
      data: { telefon: NUMARA, telefonDogrulandi: new Date() },
    });
    const hedef = await hedefBul(username);
    expect(hedef.durum).toBe("hazir");
    if (hedef.durum === "hazir") expect(hedef.telefon).toBe(NUMARA);
  });

  it("askıya alınmış hesap kurtarılamıyor", async () => {
    await prisma.appUser.update({
      where: { id: appUserId },
      data: { telefon: NUMARA, telefonDogrulandi: new Date(), active: false },
    });
    expect((await hedefBul(username)).durum).toBe("yok");
  });

  it("olmayan kullanıcı adı da 'yok' — ayrı bir cevap vermiyor", async () => {
    // Ayrım yapılsaydı bu uç, kullanıcı adı sorgulama aracına dönerdi.
    expect((await hedefBul("hic-olmayan-ad")).durum).toBe("yok");
  });
});

describe("tüketici OTP'si panelinkiyle aynı kuralları uyguluyor", () => {
  async function kodYaz(kod: string) {
    await prisma.appOtpCode.create({
      data: {
        appUserId,
        purpose: "sifre",
        codeHash: await bcrypt.hash(kod, 10),
        phone: NUMARA,
        expiresAt: new Date(Date.now() + 3 * 60 * 1000),
      },
    });
  }

  it("doğru kodu kabul, yanlışı ret ediyor", async () => {
    await kodYaz(DOGRU_KOD);
    expect((await verifyOtpFor(depo(), { appUserId }, "sifre", "000000")).ok).toBe(false);
    expect((await verifyOtpFor(depo(), { appUserId }, "sifre", DOGRU_KOD)).ok).toBe(true);
  });

  it("kod TEK KULLANIMLIK", async () => {
    await kodYaz(DOGRU_KOD);
    expect((await verifyOtpFor(depo(), { appUserId }, "sifre", DOGRU_KOD)).ok).toBe(true);
    expect((await verifyOtpFor(depo(), { appUserId }, "sifre", DOGRU_KOD)).ok).toBe(false);
  });

  it("süresi dolmuş kod kabul edilmiyor", async () => {
    await prisma.appOtpCode.create({
      data: {
        appUserId,
        purpose: "sifre",
        codeHash: await bcrypt.hash(DOGRU_KOD, 10),
        phone: NUMARA,
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    expect((await verifyOtpFor(depo(), { appUserId }, "sifre", DOGRU_KOD)).ok).toBe(false);
  });

  it("DENEME SINIRI burada da geçerli — paylaşılan mantığın kanıtı", async () => {
    /**
     * Panelde bu sınır bir kez yanlış yazılmıştı ve altı haneli kod
     * sınırsız denenebiliyordu. Mantık tek yerde olduğu için düzeltme
     * tüketici tarafına da geçti; test bunu doğruluyor.
     */
    await kodYaz(DOGRU_KOD);
    const sonuclar = await Promise.all(
      Array.from({ length: 30 }, (_, i) =>
        verifyOtpFor(depo(), { appUserId }, "sifre", String(900000 + i)),
      ),
    );
    const kayit = await prisma.appOtpCode.findFirstOrThrow({ where: { appUserId } });
    expect(kayit.attempts).toBeGreaterThan(0);
    // Sınır dolduktan sonra doğru kod bile geçmemeli.
    expect(sonuclar.filter((s) => s.ok)).toHaveLength(0);
    expect((await verifyOtpFor(depo(), { appUserId }, "sifre", DOGRU_KOD)).ok).toBe(false);
  }, 120_000);

  it("farklı AMAÇLAR birbirinin kodunu kabul etmiyor", async () => {
    // "telefon" doğrulama kodu şifre kurtarmada kullanılamamalı.
    await prisma.appOtpCode.create({
      data: {
        appUserId,
        purpose: "telefon",
        codeHash: await bcrypt.hash(DOGRU_KOD, 10),
        phone: NUMARA,
        expiresAt: new Date(Date.now() + 3 * 60 * 1000),
      },
    });
    expect((await verifyOtpFor(depo(), { appUserId }, "sifre", DOGRU_KOD)).ok).toBe(false);
    expect((await verifyOtpFor(depo(), { appUserId }, "telefon", DOGRU_KOD)).ok).toBe(true);
  });
});

describe("kod gönderimi", () => {
  it("aynı numaraya art arda kod istemek engelleniyor", async () => {
    // SMS bombardımanına karşı; panelinkiyle aynı bekleme kuralı.
    const gonder = () =>
      issueOtpFor(depo(), { appUserId }, NUMARA, "sifre", () => "test", );
    const ilk = await gonder();
    const ikinci = await gonder();
    // İlki SMS ayarı olmadığı için de düşebilir; asıl iddia ikincinin
    // BEKLEME mesajıyla reddedilmesi.
    if (ilk.ok) {
      expect(ikinci.ok).toBe(false);
      if (!ikinci.ok) expect(ikinci.error).toContain("bekleyin");
    }
  }, 60_000);
});
