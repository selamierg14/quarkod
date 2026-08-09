import "server-only";
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { sendSms } from "./sms";

/**
 * Tek kullanımlık SMS kodları.
 *
 * Kod veritabanında düz metin durmaz; şifre gibi hash'lenir. Veritabanını
 * gören biri aktif kodları okuyup başkasının hesabına giremesin diye.
 */

export type OtpPurpose = "giris" | "sifre";

const CODE_LENGTH = 6;
export const OTP_TTL_MINUTES = 5;
const MAX_ATTEMPTS = 5;
/** Aynı kullanıcıya bu süre içinde yeni kod üretilmez (SMS bombardımanı olmasın). */
const RESEND_COOLDOWN_SECONDS = 60;

function generateCode(): string {
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
}

/** Numaranın son 4 hanesi dışında hepsini gizler: "+90 5•• ••• •• 33". */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const last4 = digits.slice(-4);
  return `+90 5•• ••• ${last4.slice(0, 2)} ${last4.slice(2)}`;
}

export type IssueResult =
  | { ok: true; maskedPhone: string }
  | { ok: false; error: string };

/**
 * Kullanıcıya kod üretip SMS ile gönderir.
 *
 * Kod gönderilemezse kayıt da silinir — kullanıcıyı eline geçmeyecek bir kodu
 * beklerken bırakmak, hata mesajı vermekten daha kötü.
 */
export async function issueOtp(
  userId: string,
  phone: string,
  purpose: OtpPurpose,
): Promise<IssueResult> {
  const since = new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000);
  const recent = await prisma.otpCode.findFirst({
    where: { userId, purpose, createdAt: { gte: since }, usedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (recent) {
    return {
      ok: false,
      error: `Az önce bir kod gönderildi. Yeni kod istemek için ${RESEND_COOLDOWN_SECONDS} saniye bekleyin.`,
    };
  }

  // Bekleyen eski kodlar geçersizleşsin: aynı anda iki geçerli kod olmasın.
  await prisma.otpCode.updateMany({
    where: { userId, purpose, usedAt: null },
    data: { usedAt: new Date() },
  });

  const code = generateCode();
  const record = await prisma.otpCode.create({
    data: {
      userId,
      purpose,
      codeHash: await bcrypt.hash(code, 10),
      expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
    },
  });

  const metin =
    purpose === "giris"
      ? `Memnuniyet paneli giris kodunuz: ${code}. ${OTP_TTL_MINUTES} dakika gecerlidir.`
      : `Sifre sifirlama kodunuz: ${code}. ${OTP_TTL_MINUTES} dakika gecerlidir.`;

  const sonuc = await sendSms(phone, metin);
  if (!sonuc.sent) {
    await prisma.otpCode.delete({ where: { id: record.id } });
    return { ok: false, error: sonuc.error ?? "Kod gönderilemedi." };
  }

  return { ok: true, maskedPhone: maskPhone(phone) };
}

export type VerifyResult = { ok: true } | { ok: false; error: string };

/** Kodu doğrular ve tek kullanımlık olarak yakar. */
export async function verifyOtp(
  userId: string,
  purpose: OtpPurpose,
  code: string,
): Promise<VerifyResult> {
  const record = await prisma.otpCode.findFirst({
    where: { userId, purpose, usedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return { ok: false, error: "Geçerli bir kod bulunamadı. Yeniden kod isteyin." };
  }
  if (record.expiresAt < new Date()) {
    return { ok: false, error: "Kodun süresi doldu. Yeniden kod isteyin." };
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    await prisma.otpCode.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    return { ok: false, error: "Çok fazla hatalı deneme. Yeniden kod isteyin." };
  }

  const dogru = await bcrypt.compare(code.trim(), record.codeHash);
  if (!dogru) {
    await prisma.otpCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    const kalan = MAX_ATTEMPTS - (record.attempts + 1);
    return {
      ok: false,
      error:
        kalan > 0
          ? `Kod hatalı. ${kalan} deneme hakkınız kaldı.`
          : "Kod hatalı. Yeniden kod isteyin.",
    };
  }

  await prisma.otpCode.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });
  return { ok: true };
}
