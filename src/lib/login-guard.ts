import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "./db";
import type { PrismaClient } from "@/generated/prisma/client";

/**
 * Sayaçları okuyup yazan işlemler `PrismaClient` alan saf yardımcılara
 * ayrıldı: kilit mantığı, istek başlıklarına ve tekil istemciye bağlı
 * kalmadan gerçek bir veritabanına karşı sınanabilsin diye
 * (bkz. src/lib/login-guard.test.ts). Sunucudan çağrılan sarmalayıcılar
 * dosyanın altında.
 */
type Sayac = Pick<PrismaClient, "loginAttempt">;

/**
 * Admin girişinde kaba kuvvet koruması.
 *
 * Hem kullanıcı adı hem IP ayrı ayrı sayılır: tek hesabı hedefleyen saldırı
 * kullanıcı adı eşiğine, çok sayıda hesabı deneyen saldırı IP eşiğine takılır.
 *
 * Başarılı girişten sonraki denemeler sayılmaz — kilit yalnızca son başarılı
 * girişten bu yana biriken hatalara bakar; böylece normal kullanıcı bir kez
 * yanlış yazdı diye gün boyu ceza çekmez.
 *
 * Kilit SON hatalı denemeden itibaren işler, ilkinden değil. İlk hatadan
 * saymak, saldırganın denemeleri pencereye yayarak cezayı sıfırlamasına izin
 * veriyordu: 6 deneme yap, birkaç dakika bekle, en eskisi pencereden düşünce
 * yeniden 6 hakkın olsun. Son denemeden saymak bu kapıyı kapatıyor ve normal
 * kullanıcı için bir şey değiştirmiyor — o zaten yeniden denemiyor.
 */
export const MAX_FAILURES_PER_EMAIL = 6;
export const MAX_FAILURES_PER_IP = 20;
export const LOCK_WINDOW_MINUTES = 10;

export type GuardResult =
  | { allowed: true }
  | { allowed: false; retryAfterMinutes: number };

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

async function currentIpHash(): Promise<string | null> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "";
  return ip ? hashIp(ip) : null;
}

/**
 * Verilen pencerede, son başarılı denemeden sonraki başarısız deneme sayısı.
 *
 * Sayım `count` ile yapılıyor, satırlar çekilip uzunluğuna bakılarak değil:
 * bu fonksiyon her giriş denemesinde iki kez (kullanıcı adı ve IP için)
 * çalışıyor ve kilitli bir hesapta yüzlerce satır dönebiliyordu. Sayı ile
 * en son hatanın zamanı tek turda, yan yana isteniyor.
 */
async function failuresSince(
  db: Sayac,
  where: { email: string } | { ipHash: string },
  windowStart: Date,
): Promise<{ count: number; newest: Date | null }> {
  const lastSuccess = await db.loginAttempt.findFirst({
    where: { ...where, success: true, createdAt: { gte: windowStart } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  const from = lastSuccess ? lastSuccess.createdAt : windowStart;
  const failureWhere = { ...where, success: false, createdAt: { gt: from } };

  const [count, newest] = await Promise.all([
    db.loginAttempt.count({ where: failureWhere }),
    db.loginAttempt.findFirst({
      where: failureWhere,
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  return { count, newest: newest?.createdAt ?? null };
}

/** Kilit kararının kendisi; istek başlıklarından bağımsız. */
export async function checkLoginAllowedFor(
  db: Sayac,
  email: string,
  ipHash: string | null,
): Promise<GuardResult> {
  const windowStart = new Date(Date.now() - LOCK_WINDOW_MINUTES * 60 * 1000);
  const normalized = email.trim().toLowerCase();

  // Kullanıcı adı ve IP sayaçları birbirinden bağımsız; sırayla sormak
  // her girişe boş yere bir tur veritabanı gecikmesi ekliyordu.
  const [byEmail, byIp] = await Promise.all([
    failuresSince(db, { email: normalized }, windowStart),
    ipHash
      ? failuresSince(db, { ipHash }, windowStart)
      : Promise.resolve({ count: 0, newest: null as Date | null }),
  ]);

  // Sayaç, denemeden ÖNCE okunuyor: eşiğe eşit olması "kotayı doldurdu"
  // demektir. 6 hatalı deneme serbest, 7.'si kilitli.
  const emailLocked = byEmail.count >= MAX_FAILURES_PER_EMAIL;
  const ipLocked = byIp.count >= MAX_FAILURES_PER_IP;

  if (!emailLocked && !ipLocked) return { allowed: true };

  const newest = emailLocked ? byEmail.newest : byIp.newest;
  const unlockAt = new Date(
    (newest?.getTime() ?? Date.now()) + LOCK_WINDOW_MINUTES * 60 * 1000,
  );
  const remaining = Math.max(1, Math.ceil((unlockAt.getTime() - Date.now()) / 60000));

  return { allowed: false, retryAfterMinutes: remaining };
}

export async function recordLoginAttemptFor(
  db: Sayac,
  email: string,
  success: boolean,
  ipHash: string | null,
) {
  await db.loginAttempt.create({
    data: { email: email.trim().toLowerCase(), ipHash, success },
  });
}

/** Giriş denenmeden önce çağrılır. */
export async function checkLoginAllowed(email: string): Promise<GuardResult> {
  return checkLoginAllowedFor(prisma, email, await currentIpHash());
}

export async function recordLoginAttempt(email: string, success: boolean) {
  await recordLoginAttemptFor(prisma, email, success, await currentIpHash());
}

/** Eski kayıtlar birikmesin — girişte ara sıra temizlenir. */
export async function pruneLoginAttempts() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: cutoff } } });
}
