import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import {
  LOCK_WINDOW_MINUTES,
  MAX_FAILURES_PER_EMAIL,
  MAX_FAILURES_PER_IP,
  checkLoginAllowedFor,
  girisDenemesiAyirFor,
  girisSonucuFor,
  recordLoginAttemptFor,
} from "./login-guard";

/**
 * Kaba kuvvet kilidinin gerçek veritabanına karşı sınavı.
 *
 * Buradaki bir kırmızı, "panel şifresi sınırsız denenebiliyor" demektir.
 */

let prisma: PrismaClient;
const schemaName = `test_login_${randomBytes(6).toString("hex")}`;
const IP = "a".repeat(32);

beforeAll(async () => {
  // HAVUZSUZ bağlantı — bu test kendi Postgres şemasını kurup `search_path`
  // ile ona bağlanıyor; PgBouncer işlem kipinde oturum ayarını taşımıyor.
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
});

afterAll(async () => {
  await prisma?.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
  await prisma?.$disconnect();
});

beforeEach(async () => {
  await prisma.loginAttempt.deleteMany({});
});

/** Sayaç kaydını istediğimiz kadar geçmişe alır. */
async function hatayiGeriyeAl(email: string, dakika: number) {
  const kayit = await prisma.loginAttempt.findFirst({
    where: { email },
    orderBy: { createdAt: "desc" },
  });
  await prisma.loginAttempt.update({
    where: { id: kayit!.id },
    data: { createdAt: new Date(Date.now() - dakika * 60 * 1000) },
  });
}

describe("kullanıcı adı eşiği", () => {
  it(`${MAX_FAILURES_PER_EMAIL} hatalı denemeye izin verir, sonrakini kilitler`, async () => {
    const email = "kilit-testi";

    for (let i = 0; i < MAX_FAILURES_PER_EMAIL; i++) {
      const izin = await checkLoginAllowedFor(prisma, email, IP);
      expect(izin.allowed, `${i + 1}. deneme serbest olmalı`).toBe(true);
      await recordLoginAttemptFor(prisma, email, false, IP);
    }

    const sonuc = await checkLoginAllowedFor(prisma, email, IP);
    expect(sonuc.allowed).toBe(false);
    if (sonuc.allowed) return;
    expect(sonuc.retryAfterMinutes).toBeGreaterThan(0);
    expect(sonuc.retryAfterMinutes).toBeLessThanOrEqual(LOCK_WINDOW_MINUTES);
  });

  it("kilit son hatalı denemeden itibaren sayılır", async () => {
    const email = "pencere-testi";
    for (let i = 0; i < MAX_FAILURES_PER_EMAIL; i++) {
      await recordLoginAttemptFor(prisma, email, false, IP);
    }
    expect((await checkLoginAllowedFor(prisma, email, IP)).allowed).toBe(false);

    // Son hata pencerenin dışına çıkınca kilit düşer.
    await prisma.loginAttempt.updateMany({
      where: { email },
      data: {
        createdAt: new Date(Date.now() - (LOCK_WINDOW_MINUTES + 1) * 60 * 1000),
      },
    });
    expect((await checkLoginAllowedFor(prisma, email, IP)).allowed).toBe(true);
  });

  it("denemeleri pencereye yayarak kilit atlatılamaz", async () => {
    const email = "yayma-testi";

    // Eşiği doldur, sonra en eski hatayı pencerenin kenarına it. Kilit ilk
    // hatadan sayılsaydı burada açılırdı; son hatadan saydığımız için kapalı.
    for (let i = 0; i < MAX_FAILURES_PER_EMAIL; i++) {
      await recordLoginAttemptFor(prisma, email, false, IP);
    }
    await hatayiGeriyeAl(email, LOCK_WINDOW_MINUTES - 1);

    expect((await checkLoginAllowedFor(prisma, email, IP)).allowed).toBe(false);
  });

  it("başarılı giriş sayacı sıfırlar", async () => {
    const email = "sifirlama-testi";
    for (let i = 0; i < MAX_FAILURES_PER_EMAIL; i++) {
      await recordLoginAttemptFor(prisma, email, false, IP);
    }
    expect((await checkLoginAllowedFor(prisma, email, IP)).allowed).toBe(false);

    await recordLoginAttemptFor(prisma, email, true, IP);
    expect((await checkLoginAllowedFor(prisma, email, IP)).allowed).toBe(true);
  });

  it("bir kullanıcının kilidi diğerini kilitlemez", async () => {
    for (let i = 0; i < MAX_FAILURES_PER_EMAIL; i++) {
      await recordLoginAttemptFor(prisma, "kurban", false, null);
    }
    expect((await checkLoginAllowedFor(prisma, "kurban", null)).allowed).toBe(false);
    expect((await checkLoginAllowedFor(prisma, "masum", null)).allowed).toBe(true);
  });

  it("büyük/küçük harf ve boşluk farkıyla eşik atlatılamaz", async () => {
    for (let i = 0; i < MAX_FAILURES_PER_EMAIL; i++) {
      await recordLoginAttemptFor(prisma, "  KaRma  ", false, IP);
    }
    expect((await checkLoginAllowedFor(prisma, "karma", IP)).allowed).toBe(false);
    expect((await checkLoginAllowedFor(prisma, "KARMA", IP)).allowed).toBe(false);
  });
});

describe("IP eşiği", () => {
  it("her denemede farklı kullanıcı adı yazan saldırgan IP'den takılır", async () => {
    const saldirganIp = "b".repeat(32);

    for (let i = 0; i < MAX_FAILURES_PER_IP; i++) {
      const izin = await checkLoginAllowedFor(prisma, `kullanici-${i}`, saldirganIp);
      expect(izin.allowed, `${i + 1}. deneme serbest olmalı`).toBe(true);
      await recordLoginAttemptFor(prisma, `kullanici-${i}`, false, saldirganIp);
    }

    // Hiçbir kullanıcı adı kendi eşiğini doldurmadı; kilidi IP koyuyor.
    expect(
      (await checkLoginAllowedFor(prisma, "yepyeni-kullanici", saldirganIp)).allowed,
    ).toBe(false);
    // Aynı kullanıcı adı başka bir IP'den hâlâ deneyebilir.
    expect(
      (await checkLoginAllowedFor(prisma, "yepyeni-kullanici", "c".repeat(32))).allowed,
    ).toBe(true);
  });
});

describe("eşzamanlı deneme — yer ayırma", () => {
  it("40 EŞZAMANLI yanlış şifre kilidi AŞAMIYOR", async () => {
    /**
     * TESTİN EN ÖNEMLİ MADDESİ ve gerçek bir açığın kaydı. Eski akış "kilit
     * var mı bak → şifreyi dene → yaz" idi; canlı ölçümde tek kullanıcı
     * adına eşzamanlı gönderilen 40 tahminin 40'ı da şifre kontrolüne
     * ulaştı. Yer ayırmayla en fazla eşik kadarı ulaşabilmeli.
     */
    const sonuclar = await Promise.all(
      Array.from({ length: 40 }, () => girisDenemesiAyirFor(prisma, "hedef", null)),
    );
    // Sıfır da olabilir: hepsi yazıp sonra sayarsa hepsi 40 görür ve hepsi
    // reddedilir. Bu güvenli taraf — hiçbir tahmin şifre kontrolüne
    // ulaşmıyor. Sınır yalnızca üstten.
    expect(sonuclar.filter((s) => s.allowed).length).toBeLessThanOrEqual(MAX_FAILURES_PER_EMAIL);
  }, 60_000);

  it("SIRALI denemelerde meşru kullanıcı tam hakkını kullanabiliyor", async () => {
    // Yer ayırma, normal kullanımda eşiği daraltmamalı: 6 deneme serbest,
    // 7.si kilitli — eski davranışla aynı.
    for (let i = 0; i < MAX_FAILURES_PER_EMAIL; i++) {
      expect((await girisDenemesiAyirFor(prisma, "sirali", null)).allowed, `deneme ${i + 1}`).toBe(true);
    }
    expect((await girisDenemesiAyirFor(prisma, "sirali", null)).allowed).toBe(false);
  });

  it("başarılı giriş satırı başarılıya dönüyor ve kullanıcı sayacını sıfırlıyor", async () => {
    for (let i = 0; i < MAX_FAILURES_PER_EMAIL - 1; i++) {
      await girisDenemesiAyirFor(prisma, "gercek", null);
    }
    const izin = await girisDenemesiAyirFor(prisma, "gercek", null);
    expect(izin.allowed).toBe(true);
    if (izin.allowed) await girisSonucuFor(prisma, izin.kayitId, true);

    // Başarıdan sonra yeniden tam hak.
    expect((await checkLoginAllowedFor(prisma, "gercek", null)).allowed).toBe(true);
  });
});

describe("IP sayacı başarılı girişle SIFIRLANMIYOR", () => {
  it("saldırgan kendi hesabına girerek IP kilidini açamıyor", async () => {
    /**
     * Açık şuydu: IP sayacı da başarılı girişte sıfırlanıyordu. Kendi
     * hesabı olan saldırgan, başka hesaplara yaptığı tahminlerin arasına
     * kendi hesabına bir giriş sıkıştırıp IP eşiğine hiç takılmıyordu.
     */
    for (let i = 0; i < MAX_FAILURES_PER_IP; i++) {
      await recordLoginAttemptFor(prisma, `kurban-${i}`, false, IP);
    }
    // Kendi hesabına başarılı giriş — aynı IP.
    await recordLoginAttemptFor(prisma, "saldirganin-kendi-hesabi", true, IP);

    const karar = await checkLoginAllowedFor(prisma, "yeni-kurban", IP);
    expect(karar.allowed).toBe(false);
  });
});
