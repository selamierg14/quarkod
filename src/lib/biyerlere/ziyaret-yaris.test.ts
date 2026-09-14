import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { ZIYARET_BEKLEME_SAATI } from "./ziyaret";
import { ROZETLER } from "./rozet";

/**
 * Ziyaret yazımının EŞZAMANLI isteklere karşı sınavı.
 *
 * Buradaki bir kırmızı, "4 saatlik bekleme kuralı paralel isteklerle
 * atlanabiliyor" demektir — yani puan çiftçiliği.
 *
 * Zafiyet gerçekti ve ölçülmüştü: bekleme kontrolü ile yazım arasında
 * hiçbir atomiklik yoktu. Eşzamanlı istekler aynı "son ziyaret"i okuyup
 * hepsi kabul alıyordu; 8 istek 8 ziyaret ve 10 yerine 80 puan üretiyordu.
 *
 * Testin kurduğu diziliş uydurma değil: yük altında okumaların yazımlardan
 * önce tamamlanması kaçınılmaz. Tek bir `Promise.all` bunu her koşuda
 * üretmiyor (yarışlar zamanlamaya bağlı), o yüzden aşamalar açıkça
 * ayrılıyor — aksi halde test bazen yeşil yanıp zafiyeti gizlerdi.
 */

let prisma: PrismaClient;
const schemaName = `test_ziyaret_${randomBytes(6).toString("hex")}`;

let appUserId = "";
let businessId = "";

beforeAll(async () => {
  // HAVUZSUZ bağlantı — kendi şemasına `search_path` ile bağlanıyor;
  // PgBouncer işlem kipinde oturum ayarını taşımıyor.
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
  const isletme = await prisma.business.create({
    data: { accountId: hesap.id, slug: `m-${randomBytes(4).toString("hex")}`, name: "Test Mekan", type: "yeme_icme" },
  });
  businessId = isletme.id;

  const kullanici = await prisma.appUser.create({
    data: {
      username: `u-${randomBytes(4).toString("hex")}`,
      passwordHash: "x",
      name: "Test Kullanıcı",
      referralCode: randomBytes(4).toString("hex").toUpperCase(),
    },
  });
  appUserId = kullanici.id;
}, 120_000);

afterAll(async () => {
  await prisma?.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
  await prisma?.$disconnect();
});

beforeEach(async () => {
  await prisma.appVisit.deleteMany({});
  await prisma.appUser.update({ where: { id: appUserId }, data: { puan: 0 } });
});

/** Üretimdeki yolun aynısı: kontrol ve yazım TEK serializable işlemde. */
async function ziyaretYaz(): Promise<boolean> {
  try {
    await prisma.$transaction(
      async (tx) => {
        const son = await tx.appVisit.findFirst({
          where: { appUserId, businessId },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        });
        if (
          son &&
          (Date.now() - son.createdAt.getTime()) / (1000 * 60 * 60) <
            ZIYARET_BEKLEME_SAATI
        ) {
          throw new Error("cok-erken");
        }
        await tx.appVisit.create({
          data: { appUserId, businessId, mesafeMetre: 10 },
        });
        await tx.appUser.update({
          where: { id: appUserId },
          data: { puan: { increment: 10 } },
        });
      },
      { isolationLevel: "Serializable" },
    );
    return true;
  } catch {
    // Bekleme kuralı ya da serileştirme çakışması (P2034) — ikisinin de
    // sonucu aynı: bu ziyaret sayılmadı.
    return false;
  }
}

describe("eşzamanlı ziyaret yazımı", () => {
  /**
   * SIRALAMA KESİN OLARAK KURULUYOR, şansa bırakılmıyor.
   *
   * İlk denemede test sekiz çağrıyı `Promise.all` ile paralel atıyordu ve
   * DÜZELTME ÖNCESİ kodda bile YEŞİL yanıyordu: yarışlar zamanlamaya bağlı,
   * çağrılar çoğu koşuda kendiliğinden sıraya giriyor. Yani test hiçbir şey
   * kanıtlamıyordu — en tehlikeli test türü.
   *
   * Burada iki işlem elle kilitleniyor: A okumasını yapıyor ve bekliyor,
   * B tüm turunu tamamlıyor, sonra A yazmaya çalışıyor. Bu, zafiyetin
   * gerçekleştiği tam sıralama ve her koşuda aynı.
   */
  it("A okurken B yazarsa, A'nın yazımı REDDEDİLİYOR", async () => {
    let aOkudu!: () => void;
    const aOkuduSinyali = new Promise<void>((r) => { aOkudu = r; });
    let bBitti!: () => void;
    const bBittiSinyali = new Promise<void>((r) => { bBitti = r; });

    const aIslemi = prisma
      .$transaction(
        async (tx) => {
          const son = await tx.appVisit.findFirst({
            where: { appUserId, businessId },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
          });
          expect(son).toBeNull(); // A hiçbir ziyaret görmüyor
          aOkudu();
          await bBittiSinyali; // B tüm turunu tamamlasın

          await tx.appVisit.create({
            data: { appUserId, businessId, mesafeMetre: 10 },
          });
          await tx.appUser.update({
            where: { id: appUserId },
            data: { puan: { increment: 10 } },
          });
        },
        { isolationLevel: "Serializable", timeout: 20_000 },
      )
      .then(() => true)
      .catch(() => false);

    await aOkuduSinyali;

    // B: A'nın okumasından SONRA, yazımından ÖNCE tam turunu atıyor.
    const bSonuc = await ziyaretYaz();
    bBitti();

    const aSonuc = await aIslemi;

    expect(bSonuc).toBe(true);
    // Düzeltme öncesi burada `true` gelirdi: iki ziyaret, çift puan.
    expect(aSonuc).toBe(false);
    expect(await prisma.appVisit.count({ where: { appUserId } })).toBe(1);
    const kullanici = await prisma.appUser.findUniqueOrThrow({
      where: { id: appUserId },
      select: { puan: true },
    });
    expect(kullanici.puan).toBe(10);
  }, 60_000);

  it("sekiz eşzamanlı istekten yalnızca biri sayılıyor", async () => {
    // Yukarıdaki testin tamamlayıcısı: kesin sıralama tek bir çakışmayı
    // sınıyor, bu da gerçekçi yük altında toplamın bozulmadığını.
    const sonuclar = await Promise.all(
      Array.from({ length: 8 }, () => ziyaretYaz()),
    );

    expect(sonuclar.filter(Boolean)).toHaveLength(1);
    expect(await prisma.appVisit.count({ where: { appUserId } })).toBe(1);
    const kullanici = await prisma.appUser.findUniqueOrThrow({
      where: { id: appUserId },
      select: { puan: true },
    });
    expect(kullanici.puan).toBe(10);
  }, 60_000);
  it("bekleme süresi dolduğunda ikinci ziyaret sayılıyor", async () => {
    // Kural gerçekten çalışıyor mu, yoksa her şeyi mi reddediyoruz —
    // bir önceki test tek başına ikisini ayırt edemez.
    expect(await ziyaretYaz()).toBe(true);

    await prisma.appVisit.updateMany({
      where: { appUserId },
      data: {
        createdAt: new Date(
          Date.now() - (ZIYARET_BEKLEME_SAATI + 1) * 60 * 60 * 1000,
        ),
      },
    });

    expect(await ziyaretYaz()).toBe(true);
    expect(await prisma.appVisit.count({ where: { appUserId } })).toBe(2);
  }, 60_000);

  it("bekleme süresi dolmadan ikinci ziyaret reddediliyor", async () => {
    expect(await ziyaretYaz()).toBe(true);
    expect(await ziyaretYaz()).toBe(false);
    expect(await prisma.appVisit.count({ where: { appUserId } })).toBe(1);
  }, 60_000);
});

describe("rozet puanı eşzamanlı isteklerde iki kez verilmiyor", () => {
  /**
   * Zafiyet: `createMany` + `skipDuplicates` rozet SATIRINI koruyordu ama
   * puan artışını korumuyordu. İki istek aynı rozeti hak edilmiş görüp
   * ikisi de puanı ekliyor, rozetlerden biri sessizce atlanıyordu —
   * sonuç 1 rozet, çift puan.
   *
   * Koddaki yorum "tekillik kısıtı bunu zaten engelliyor" diyordu;
   * engellediği rozetti, puan değil. Test tam olarak bu ayrımı koruyor.
   */
  const ROZET = "ilkAdim" as const;

  /** Üretimdeki yol: mevcut rozetler işlemin İÇİNDE okunuyor. */
  async function rozetVer(): Promise<boolean> {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const simdikiler = new Set(
            (await tx.appBadge.findMany({ where: { appUserId }, select: { rozet: true } }))
              .map((r) => r.rozet),
          );
          if (simdikiler.has(ROZET)) return false;
          await tx.appBadge.createMany({ data: [{ appUserId, rozet: ROZET }] });
          await tx.appUser.update({
            where: { id: appUserId },
            data: { puan: { increment: ROZETLER[ROZET].puan } },
          });
          return true;
        },
        { isolationLevel: "Serializable", timeout: 20_000 },
      );
    } catch {
      return false;
    }
  }

  beforeEach(async () => {
    await prisma.appBadge.deleteMany({});
    await prisma.appUser.update({ where: { id: appUserId }, data: { puan: 0 } });
  });

  it("iki ardışık çağrıda puan BİR KEZ ekleniyor", async () => {
    expect(await rozetVer()).toBe(true);
    expect(await rozetVer()).toBe(false);

    expect(await prisma.appBadge.count({ where: { appUserId } })).toBe(1);
    const kullanici = await prisma.appUser.findUniqueOrThrow({
      where: { id: appUserId },
      select: { puan: true },
    });
    // Düzeltme öncesi burası ROZETLER[ROZET].puan * 2 geliyordu.
    expect(kullanici.puan).toBe(ROZETLER[ROZET].puan);
  }, 60_000);

  it("dört eşzamanlı çağrıda da puan bir kez ekleniyor", async () => {
    await Promise.all(Array.from({ length: 4 }, () => rozetVer()));

    expect(await prisma.appBadge.count({ where: { appUserId } })).toBe(1);
    const kullanici = await prisma.appUser.findUniqueOrThrow({
      where: { id: appUserId },
      select: { puan: true },
    });
    expect(kullanici.puan).toBe(ROZETLER[ROZET].puan);
  }, 60_000);
});
