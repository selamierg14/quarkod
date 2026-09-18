import "server-only";
import { headers } from "next/headers";
import { istemciIp, ipOzeti } from "./istemci-ip";
import { prisma } from "../cekirdek/db";
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

async function currentIpHash(): Promise<string | null> {
  return ipOzeti(istemciIp(await headers()));
}

async function failuresSince(
  db: Sayac,
  where: { email: string } | { ipHash: string },
  windowStart: Date,
): Promise<{ count: number; newest: Date | null }> {
  /**
   * Başarılı giriş sayacı YALNIZCA KULLANICI ADI için sıfırlıyor, IP için
   * değil.
   *
   * IP sayacı da sıfırlanıyordu ve bu bir açıktı: kendi hesabı olan
   * saldırgan, başka hesaplara yaptığı tahminlerin arasına kendi hesabına
   * başarılı bir giriş sıkıştırıp IP kilidini hiç devreye sokmadan
   * sınırsız deneme yapabiliyordu. Kullanıcı adı için sıfırlama doğru:
   * şifresini bir kez yanlış yazıp sonra giren kişi cezalandırılmamalı.
   */
  const lastSuccess =
    "email" in where
      ? await db.loginAttempt.findFirst({
          where: { ...where, success: true, createdAt: { gte: windowStart } },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        })
      : null;

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
export type GirisIzni =
  | { allowed: true; kayitId: string }
  | { allowed: false; retryAfterMinutes: number };

/**
 * GİRİŞ DENEMESİ İÇİN YER AYIRIR — şifre kontrolünden ÖNCE çağrılır.
 *
 * Önceki akış "kilit var mı bak → şifreyi dene → sonucu yaz" idi ve
 * eşzamanlı isteklerde çöküyordu: hepsi kilidi açık görüp şifre
 * denemesine geçiyordu. Canlı ölçüldü — tek kullanıcı adına 40 eşzamanlı
 * yanlış şifre gönderildi, 6'da kilitlenmesi gereken hesap 40 tahminin
 * hepsini işledi.
 *
 * Şimdi deneme ÖNCE "başarısız" olarak yazılıyor, SONRA sayılıyor. Bir
 * isteğin sayımı kendisinden önce sayım yapmış her isteğin satırını
 * görüyor, yani eşiğin üstündeki her istek şifreye dokunmadan
 * reddediliyor. Giriş başarılı olursa `girisSonucu` satırı başarılıya
 * çeviriyor.
 */
export async function girisDenemesiAyirFor(
  db: Sayac,
  email: string,
  ipHash: string | null,
): Promise<GirisIzni> {
  const normalized = email.trim().toLowerCase();
  const kayit = await db.loginAttempt.create({
    data: { email: normalized, ipHash, success: false },
    select: { id: true },
  });

  const windowStart = new Date(Date.now() - LOCK_WINDOW_MINUTES * 60 * 1000);
  const [byEmail, byIp] = await Promise.all([
    failuresSince(db, { email: normalized }, windowStart),
    ipHash
      ? failuresSince(db, { ipHash }, windowStart)
      : Promise.resolve({ count: 0, newest: null as Date | null }),
  ]);

  // Kendi satırı da sayıldı: eşiğe EŞİT olmak hâlâ izinli (6. deneme
  // serbest, 7.si kilitli — önceki davranışla aynı).
  if (byEmail.count <= MAX_FAILURES_PER_EMAIL && byIp.count <= MAX_FAILURES_PER_IP) {
    return { allowed: true, kayitId: kayit.id };
  }

  // Reddedilen deneme sayılmıyor: kilitli hesaba yeniden denemek kilidi
  // uzatmamalı (kilit zaten SON hatalı denemeden itibaren işliyor).
  await db.loginAttempt.delete({ where: { id: kayit.id } }).catch(() => {});
  const karar = await checkLoginAllowedFor(db, normalized, ipHash);
  return karar.allowed
    ? // Silme ile sayım arasında pencereden kayıt düşmüş olabilir; yine de
      // bu denemeyi reddetmek güvenli taraf.
      { allowed: false, retryAfterMinutes: 1 }
    : karar;
}

/** Şifre doğrulandıysa ayrılan satırı başarılıya çevirir. */
export async function girisSonucuFor(db: Sayac, kayitId: string, basarili: boolean) {
  if (!basarili) return;
  await db.loginAttempt.update({ where: { id: kayitId }, data: { success: true } });
}

/**
 * Yalnızca OKUR — şifre denemesi yapılmayan akışlar için (panel şifre
 * sıfırlama adımı). Orada yer ayırmak, başkasının kullanıcı adıyla
 * sıfırlama isteği yağdıran birinin o kişinin GİRİŞİNİ kilitlemesine yol
 * açardı.
 */
export async function girisKilidiKontrol(email: string): Promise<GuardResult> {
  return checkLoginAllowedFor(prisma, email, await currentIpHash());
}

export async function girisDenemesiAyir(email: string): Promise<GirisIzni> {
  return girisDenemesiAyirFor(prisma, email, await currentIpHash());
}

export async function girisSonucu(kayitId: string, basarili: boolean) {
  return girisSonucuFor(prisma, kayitId, basarili);
}

export async function pruneLoginAttempts(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { count } = await prisma.loginAttempt.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return count;
}
