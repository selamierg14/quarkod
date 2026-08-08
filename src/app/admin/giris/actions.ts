"use server";

import { redirect } from "next/navigation";
import { authenticate, clearSessionCookie, setSessionCookie } from "@/lib/auth";
import {
  checkLoginAllowed,
  pruneLoginAttempts,
  recordLoginAttempt,
} from "@/lib/login-guard";

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("devam") ?? "/admin");

  if (!email || !password) {
    return { error: "E-posta ve şifre gerekli." };
  }

  const guard = await checkLoginAllowed(email);
  if (!guard.allowed) {
    return {
      error:
        `Çok fazla hatalı deneme yapıldı. ${guard.retryAfterMinutes} dakika sonra ` +
        "tekrar deneyin. Şifrenizi hatırlamıyorsanız patronunuzdan sıfırlamasını isteyin.",
    };
  }

  const user = await authenticate(email, password);

  await recordLoginAttempt(email, Boolean(user));

  if (!user) {
    // Hangi kısmın yanlış olduğunu söylemiyoruz: e-posta var mı yok mu
    // bilgisi saldırgana hesap listesi çıkarmakta yardım eder.
    return { error: "E-posta veya şifre hatalı." };
  }

  // Nadiren de olsa eski kayıtları temizle (giriş akışını bekletmesin).
  void pruneLoginAttempts().catch(() => {});

  await setSessionCookie(user);
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logout() {
  await clearSessionCookie();
  redirect("/admin/giris");
}
