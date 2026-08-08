import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "./db";

/**
 * Admin girişinde kaba kuvvet koruması.
 *
 * Hem e-posta hem IP ayrı ayrı sayılır: tek hesabı hedefleyen saldırı e-posta
 * eşiğine, çok sayıda hesabı deneyen saldırı IP eşiğine takılır.
 *
 * Başarılı girişten sonraki denemeler sayılmaz — kilit yalnızca son başarılı
 * girişten bu yana biriken hatalara bakar; böylece normal kullanıcı bir kez
 * yanlış yazdı diye gün boyu ceza çekmez.
 */
export const MAX_FAILURES_PER_EMAIL = 5;
export const MAX_FAILURES_PER_IP = 15;
export const LOCK_WINDOW_MINUTES = 15;

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

/** Verilen pencerede, son başarılı denemeden sonraki başarısız deneme sayısı. */
async function failuresSince(
  where: { email: string } | { ipHash: string },
  windowStart: Date,
): Promise<{ count: number; oldest: Date | null }> {
  const lastSuccess = await prisma.loginAttempt.findFirst({
    where: { ...where, success: true, createdAt: { gte: windowStart } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  const from = lastSuccess ? lastSuccess.createdAt : windowStart;

  const failures = await prisma.loginAttempt.findMany({
    where: { ...where, success: false, createdAt: { gt: from } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  return { count: failures.length, oldest: failures[0]?.createdAt ?? null };
}

/** Giriş denenmeden önce çağrılır. */
export async function checkLoginAllowed(email: string): Promise<GuardResult> {
  const windowStart = new Date(Date.now() - LOCK_WINDOW_MINUTES * 60 * 1000);
  const normalized = email.trim().toLowerCase();
  const ipHash = await currentIpHash();

  const byEmail = await failuresSince({ email: normalized }, windowStart);
  const byIp = ipHash
    ? await failuresSince({ ipHash }, windowStart)
    : { count: 0, oldest: null };

  const emailLocked = byEmail.count >= MAX_FAILURES_PER_EMAIL;
  const ipLocked = byIp.count >= MAX_FAILURES_PER_IP;

  if (!emailLocked && !ipLocked) return { allowed: true };

  const oldest = emailLocked ? byEmail.oldest : byIp.oldest;
  const unlockAt = new Date(
    (oldest?.getTime() ?? Date.now()) + LOCK_WINDOW_MINUTES * 60 * 1000,
  );
  const remaining = Math.max(1, Math.ceil((unlockAt.getTime() - Date.now()) / 60000));

  return { allowed: false, retryAfterMinutes: remaining };
}

export async function recordLoginAttempt(email: string, success: boolean) {
  await prisma.loginAttempt.create({
    data: {
      email: email.trim().toLowerCase(),
      ipHash: await currentIpHash(),
      success,
    },
  });
}

/** Eski kayıtlar birikmesin — girişte ara sıra temizlenir. */
export async function pruneLoginAttempts() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: cutoff } } });
}
