"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import {
  authenticate,
  clearSessionCookie,
  hashPassword,
  setSessionCookie,
  toSessionUser,
} from "@/lib/auth";
import { prisma } from "@/lib/db";
import { issueOtp, maskPhone, twoFactorEnabled, verifyOtp } from "@/lib/otp";
import { sifreSorunu } from "@/lib/sifre";
import {
  checkLoginAllowed,
  pruneLoginAttempts,
  recordLoginAttempt,
} from "@/lib/login-guard";

/**
 * Giriş ve şifre sıfırlama tek ekranda, adım adım yürür.
 *
 * Adımlar arasında "hangi kullanıcı doğrulandı" bilgisini istemciye açıkta
 * taşımıyoruz: kısa ömürlü, imzalı bir ara jeton (challenge) çerezde durur.
 * Aksi halde tarayıcıdan userId değiştirip 2. adımı başkasının hesabıyla
 * tamamlamak mümkün olurdu.
 */

const CHALLENGE_COOKIE = "mm_challenge";
const CHALLENGE_TTL_SECONDS = 10 * 60;

export type Step = "kimlik" | "kod" | "yeni-sifre";

export type LoginState = {
  step: Step;
  /** "giris" | "sifre" — hangi akıştayız. */
  mode: "giris" | "sifre";
  error?: string;
  info?: string;
  maskedPhone?: string;
};

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET tanımlı değil veya çok kısa.");
  }
  return new TextEncoder().encode(secret);
}

async function setChallenge(userId: string, purpose: "giris" | "sifre") {
  const token = await new SignJWT({ purpose })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${CHALLENGE_TTL_SECONDS}s`)
    .sign(secretKey());

  const store = await cookies();
  store.set(CHALLENGE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CHALLENGE_TTL_SECONDS,
  });
}

async function readChallenge(): Promise<{ userId: string; purpose: string } | null> {
  const store = await cookies();
  const token = store.get(CHALLENGE_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return { userId: String(payload.sub), purpose: String(payload.purpose) };
  } catch {
    return null;
  }
}

async function clearChallenge() {
  const store = await cookies();
  store.delete(CHALLENGE_COOKIE);
}

function passwordProblem(password: string): string | null {
  const sifreHatasi = sifreSorunu(password);
  if (sifreHatasi) return sifreHatasi;
  if (/^\d+$/.test(password)) return "Şifre sadece rakamlardan oluşmasın.";
  return null;
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const step = String(formData.get("step") ?? "kimlik") as Step;
  const mode = (String(formData.get("mode") ?? "giris") as "giris" | "sifre");

  // --- 1. adım: kimlik doğrulama (giriş) ya da kullanıcı adı (şifre sıfırlama)
  if (step === "kimlik") {
    const username = String(formData.get("username") ?? "").trim().toLowerCase();
    if (!username) {
      return { step: "kimlik", mode, error: "Kullanıcı adı gerekli." };
    }

    const guard = await checkLoginAllowed(username);
    if (!guard.allowed) {
      return {
        step: "kimlik",
        mode,
        error: `Çok fazla hatalı deneme. ${guard.retryAfterMinutes} dakika sonra tekrar deneyin.`,
      };
    }

    if (mode === "sifre") {
      // Şifre sıfırlamada kullanıcının var olup olmadığını sızdırmıyoruz:
      // her durumda aynı ekrana geçiyoruz. Kod yalnızca gerçek kullanıcıya gider.
      const user = await prisma.user.findUnique({ where: { username } });
      if (user?.active && user.phone) {
        const sonuc = await issueOtp(user.id, user.phone, "sifre");
        if (sonuc.ok) {
          await setChallenge(user.id, "sifre");
          return { step: "kod", mode, maskedPhone: sonuc.maskedPhone };
        }
        if (sonuc.error.includes("bekleyin")) {
          return { step: "kimlik", mode, error: sonuc.error };
        }
      }
      return {
        step: "kod",
        mode,
        maskedPhone: user?.phone ? maskPhone(user.phone) : "kayıtlı numaranız",
        info: "Kullanıcı adı kayıtlıysa telefonunuza bir kod gönderildi.",
      };
    }

    const password = String(formData.get("password") ?? "");
    if (!password) {
      return { step: "kimlik", mode, error: "Şifre gerekli." };
    }

    const user = await authenticate(username, password);
    await recordLoginAttempt(username, Boolean(user));

    if (!user) {
      return { step: "kimlik", mode, error: "Kullanıcı adı veya şifre hatalı." };
    }

    void pruneLoginAttempts().catch(() => {});

    // 2FA kapalıysa (test aşaması) ya da kullanıcının telefonu yoksa SMS adımı
    // atlanır ve doğrudan panele girilir. Bayrak .env'den açılır.
    if (!twoFactorEnabled() || !user.phone) {
      await setSessionCookie(toSessionUser(user));
      redirect("/admin");
    }

    const sonuc = await issueOtp(user.id, user.phone, "giris");
    if (!sonuc.ok) {
      return { step: "kimlik", mode, error: sonuc.error };
    }

    await setChallenge(user.id, "giris");
    return { step: "kod", mode, maskedPhone: sonuc.maskedPhone };
  }

  // --- 2. adım: SMS kodu
  if (step === "kod") {
    const challenge = await readChallenge();
    if (!challenge) {
      return { step: "kimlik", mode, error: "Oturum zaman aşımına uğradı. Baştan başlayın." };
    }

    const code = String(formData.get("code") ?? "").trim();
    const purpose = challenge.purpose === "sifre" ? "sifre" : "giris";
    const sonuc = await verifyOtp(challenge.userId, purpose, code);
    if (!sonuc.ok) {
      return {
        step: "kod",
        mode,
        error: sonuc.error,
        maskedPhone: String(formData.get("maskedPhone") ?? ""),
      };
    }

    if (purpose === "sifre") {
      // Kod doğrulandı; yeni şifre adımı için challenge'ı koruyoruz.
      await setChallenge(challenge.userId, "sifre");
      return { step: "yeni-sifre", mode: "sifre" };
    }

    const user = await prisma.user.findUnique({
      where: { id: challenge.userId },
      include: { account: true },
    });
    if (!user || !user.active) {
      await clearChallenge();
      return { step: "kimlik", mode, error: "Hesap bulunamadı." };
    }

    await clearChallenge();
    await setSessionCookie({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as "superadmin" | "owner" | "manager",
      accountId: user.accountId,
      businessId: user.businessId,
    });
    redirect("/admin");
  }

  // --- 3. adım: yeni şifre
  const challenge = await readChallenge();
  if (!challenge || challenge.purpose !== "sifre") {
    return { step: "kimlik", mode: "giris", error: "Oturum zaman aşımına uğradı." };
  }

  const yeni = String(formData.get("password") ?? "");
  const tekrar = String(formData.get("passwordRepeat") ?? "");

  if (yeni !== tekrar) {
    return { step: "yeni-sifre", mode: "sifre", error: "Şifreler birbiriyle uyuşmuyor." };
  }
  const problem = passwordProblem(yeni);
  if (problem) return { step: "yeni-sifre", mode: "sifre", error: problem };

  // passwordChangedAt: bu andan önceki oturumlar geçersizleşir. Şifresini
  // unuttuğunu sanan kullanıcı aslında hesabı ele geçirildiği için
  // giremiyor olabilir; sıfırlama saldırganı da dışarı atmalı.
  await prisma.user.update({
    where: { id: challenge.userId },
    data: { passwordHash: await hashPassword(yeni), passwordChangedAt: new Date() },
  });

  await clearChallenge();
  return {
    step: "kimlik",
    mode: "giris",
    info: "Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.",
  };
}

export async function logout() {
  await clearSessionCookie();
  redirect("/admin/giris");
}
