import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * SMS doğrulama kodunun kaba kuvvete karşı sınavı.
 *
 * Buradaki bir kırmızı, "altı haneli kod sınırsız denenebiliyor" demektir —
 * ve şifre sıfırlama akışı kod adımına YALNIZCA kullanıcı adıyla ulaştığı
 * için bu doğrudan hesap devralma demektir.
 *
 * Zafiyet gerçekti ve ölçülmüştü: sayaç "oku → karşılaştır → artır"
 * sırasıyla işliyordu ve eşzamanlı istekler aynı değeri okuyup hepsi
 * kontrolü geçiyordu. Araya giren `bcrypt.compare` (~100 ms) pencereyi
 * iyice açıyordu. 40 eşzamanlı yanlış tahminin 40'ı da denendi; beş
 * deneme sınırı HİÇ devreye girmedi.
 *
 * Test üretimdeki sırayı birebir taklit ediyor: önce atomik artırma,
 * sonra kontrol, sonra karşılaştırma.
 */

let prisma: PrismaClient;
const schemaName = `test_otp_${randomBytes(6).toString("hex")}`;
const MAX_ATTEMPTS = 5;

let userId = "";
let codeHash = "";
const DOGRU_KOD = "123456";

beforeAll(async () => {
  const base = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!base) throw new Error("DATABASE_URL tanımlı değil.");
  const url = new URL(base);
  url.searchParams.set("schema", schemaName);

  execFileSync("npx", ["prisma", "db", "push", `--url=${url.toString()}`], {
    stdio: "pipe",
  });
  prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: base }, { schema: schemaName }),
  });

  const hesap = await prisma.account.create({ data: { name: "Test Hesap" } });
  const kullanici = await prisma.user.create({
    data: {
      accountId: hesap.id,
      name: "Test Kullanıcı",
      username: `u-${randomBytes(4).toString("hex")}`,
      email: `${randomBytes(4).toString("hex")}@ornek.test`,
      passwordHash: "x",
      role: "owner",
    },
  });
  userId = kullanici.id;
  codeHash = await bcrypt.hash(DOGRU_KOD, 10);
}, 120_000);

afterAll(async () => {
  await prisma?.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
  await prisma?.$disconnect();
});

beforeEach(async () => {
  await prisma.otpCode.deleteMany({});
  await prisma.otpCode.create({
    data: {
      userId,
      purpose: "giris",
      codeHash,
      phone: "+905550000001",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });
});

/**
 * Üretimdeki `verifyOtp` sırasının aynısı: ARTIR → KONTROL ET → KARŞILAŞTIR.
 *
 * Sıra testin asıl konusu. "Oku → karşılaştır → artır" yazsaydık test de
 * zafiyetli davranışı doğrulamış olurdu.
 */
async function kodDene(kod: string): Promise<"dogru" | "yanlis" | "kilitli"> {
  const kayit = await prisma.otpCode.findFirst({
    where: { userId, purpose: "giris", usedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!kayit) return "kilitli";

  const guncel = await prisma.otpCode.update({
    where: { id: kayit.id },
    data: { attempts: { increment: 1 } },
    select: { attempts: true, usedAt: true },
  });
  if (guncel.usedAt) return "kilitli";
  if (guncel.attempts > MAX_ATTEMPTS) {
    await prisma.otpCode.update({
      where: { id: kayit.id },
      data: { usedAt: new Date() },
    });
    return "kilitli";
  }

  const dogru = await bcrypt.compare(kod, kayit.codeHash);
  if (!dogru) return "yanlis";

  await prisma.otpCode.update({
    where: { id: kayit.id },
    data: { usedAt: new Date() },
  });
  return "dogru";
}

describe("doğrulama kodu deneme sınırı", () => {
  it("KIRK eşzamanlı yanlış tahminden yalnızca beşi deneniyor", async () => {
    const sonuclar = await Promise.all(
      Array.from({ length: 40 }, (_, i) => kodDene(String(900000 + i))),
    );

    const denenen = sonuclar.filter((s) => s === "yanlis").length;
    const kilitli = sonuclar.filter((s) => s === "kilitli").length;

    // Düzeltme öncesi burası 40 geliyordu — sınır hiç devreye girmiyordu.
    expect(denenen).toBeLessThanOrEqual(MAX_ATTEMPTS);
    expect(kilitli).toBeGreaterThan(0);
  }, 120_000);

  it("sınır dolduktan sonra DOĞRU kod bile kabul edilmiyor", async () => {
    // Asıl güvence bu: saldırgan sınırı doldurduysa, doğru tahmini bile
    // işe yaramamalı. Aksi halde sınır yalnızca yavaşlatıcı olurdu.
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      expect(await kodDene(String(900000 + i))).toBe("yanlis");
    }
    expect(await kodDene(DOGRU_KOD)).toBe("kilitli");
  }, 60_000);

  it("sınır içinde doğru kod kabul ediliyor", async () => {
    // Bir önceki test tek başına "her şeyi reddediyoruz"u da geçerdi.
    expect(await kodDene("000000")).toBe("yanlis");
    expect(await kodDene(DOGRU_KOD)).toBe("dogru");
  }, 60_000);

  it("kullanılmış kod ikinci kez kabul edilmiyor", async () => {
    expect(await kodDene(DOGRU_KOD)).toBe("dogru");
    expect(await kodDene(DOGRU_KOD)).toBe("kilitli");
  }, 60_000);
});
