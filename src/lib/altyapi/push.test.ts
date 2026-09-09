import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { vapidHazirMi } from "./push";

/**
 * Push aboneliğinin yaşam döngüsü.
 *
 * Buradaki asıl risk sessiz: abonelikler silinmiyor, `disabledAt` ile
 * kapatılıyor. Gönderim tarafı "açık olanlar"ı, yeniden abone olma ise
 * "kapalıyı geri aç"ı doğru yapmazsa kimse hata görmez — kullanıcı sadece
 * butona basar ve bildirim gelmez. Bu dosya o iki kuralı bağlıyor.
 */

let prisma: PrismaClient;
const schemaName = `test_push_${randomBytes(6).toString("hex")}`;

const HESAP = "push-hesap";
const KULLANICI = "push-kullanici";
const DIGER_KULLANICI = "push-kullanici-2";
const UC_NOKTA = "https://fcm.googleapis.com/fcm/send/ornek-cihaz";

/** Gönderim tarafının kullandığı koşulun aynısı (bkz. kullanicilaraPushGonder). */
function acikAbonelikler(userId: string) {
  return prisma.pushSubscription.findMany({ where: { userId, disabledAt: null } });
}

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

  await prisma.account.create({ data: { id: HESAP, name: "Push Kafe" } });
  for (const [id, username] of [
    [KULLANICI, "push1"],
    [DIGER_KULLANICI, "push2"],
  ] as const) {
    await prisma.user.create({
      data: {
        id,
        accountId: HESAP,
        name: username,
        username,
        email: `${username}@ornek.test`,
        passwordHash: "x",
        role: "owner",
      },
    });
  }
});

afterAll(async () => {
  await prisma?.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
  await prisma?.$disconnect();
});

describe("push aboneliği", () => {
  it("VAPID anahtarı yoksa özellik kapalı sayılır", () => {
    const yedek = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "";
    expect(vapidHazirMi()).toBe(false);
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = yedek;
  });

  it("yeni abonelik açık başlar", async () => {
    await prisma.pushSubscription.create({
      data: { userId: KULLANICI, endpoint: UC_NOKTA, p256dh: "a", auth: "b" },
    });

    expect(await acikAbonelikler(KULLANICI)).toHaveLength(1);
  });

  it("kapatılan abonelik gönderim listesinden çıkar ama satır durur", async () => {
    await prisma.pushSubscription.updateMany({
      where: { endpoint: UC_NOKTA },
      data: { disabledAt: new Date(), disabledReason: "Kullanıcı kapattı." },
    });

    expect(await acikAbonelikler(KULLANICI)).toHaveLength(0);
    // Silinmiyor: "hiç açmadı mı, kapattı mı" ayrımı iz olarak kalmalı.
    const satir = await prisma.pushSubscription.findUnique({ where: { endpoint: UC_NOKTA } });
    expect(satir?.disabledReason).toBe("Kullanıcı kapattı.");
  });

  it("aynı cihaz yeniden abone olunca kayıt geri açılır", async () => {
    // push-actions.ts'teki upsert'ün aynısı. `disabledAt: null` unutulursa
    // kullanıcı butona basar, kayıt kapalı kalır, bildirim hiç gelmez.
    await prisma.pushSubscription.upsert({
      where: { endpoint: UC_NOKTA },
      update: { userId: KULLANICI, p256dh: "a2", auth: "b2", disabledAt: null, disabledReason: null },
      create: { userId: KULLANICI, endpoint: UC_NOKTA, p256dh: "a2", auth: "b2" },
    });

    expect(await acikAbonelikler(KULLANICI)).toHaveLength(1);
  });

  it("cihaz el değiştirince abonelik yeni kullanıcıya geçer, eskisine bildirim gitmez", async () => {
    // Ortak bir tablette ikinci kişi giriş yaptığında olan bu.
    await prisma.pushSubscription.upsert({
      where: { endpoint: UC_NOKTA },
      update: { userId: DIGER_KULLANICI, p256dh: "c", auth: "d", disabledAt: null, disabledReason: null },
      create: { userId: DIGER_KULLANICI, endpoint: UC_NOKTA, p256dh: "c", auth: "d" },
    });

    expect(await acikAbonelikler(KULLANICI)).toHaveLength(0);
    expect(await acikAbonelikler(DIGER_KULLANICI)).toHaveLength(1);
  });

  it("kullanıcı silinirse cihaz kaydı da gider", async () => {
    await prisma.user.delete({ where: { id: DIGER_KULLANICI } });
    expect(await prisma.pushSubscription.findMany({ where: { endpoint: UC_NOKTA } })).toHaveLength(0);
  });
});
