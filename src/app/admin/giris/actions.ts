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
} from "@/lib/kimlik/auth";
import { prisma } from "@/lib/cekirdek/db";
import { gizliAnahtar } from "@/lib/cekirdek/ortam";
import { alanDogrula } from "@/lib/cekirdek/desenler";
import { secenekAlani } from "@/lib/cekirdek/girdi";
import { ADIMLAR, KIPLER, type Step } from "@/lib/kimlik/giris-akisi";
import { issueOtp, maskPhone, twoFactorEnabled, verifyOtp } from "@/lib/kimlik/otp";
import { sifreSorunu } from "@/lib/kimlik/sifre";
import {
  checkLoginAllowed,
  pruneLoginAttempts,
  recordLoginAttempt,
} from "@/lib/kimlik/login-guard";

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

// Adım/kip sabitleri lib'de: `"use server"` dosyası yalnızca async
// fonksiyon dışa aktarabiliyor (bkz. lib/kimlik/giris-akisi.ts).
// Tip yeniden dışa aktarılıyor çünkü LoginForm onu buradan alıyor;
// tipler derlemede siliniyor, kısıt tipleri kapsamıyor.
export type { Step } from "@/lib/kimlik/giris-akisi";

export type LoginState = {
  step: Step;
  /** "giris" | "sifre" — hangi akıştayız. */
  mode: "giris" | "sifre";
  error?: string;
  info?: string;
  maskedPhone?: string;
};

/**
 * Ara jetonun imza anahtarı.
 *
 * Doğrulama artık burada kopyalanmıyor: aynı üç satır beş dosyada duruyordu
 * ve asgari uzunluk değişirse birinin unutulması kaçınılmazdı. Tek kapı
 * lib/cekirdek/ortam.ts.
 */
function secretKey(): Uint8Array {
  return new TextEncoder().encode(gizliAnahtar("AUTH_SECRET"));
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
  // Adım ve kip formdan geliyor, yani istemci bunları serbestçe yazabilir.
  // Önceden doğrudan `as Step` ile tip iddiasına çevriliyordu — TypeScript
  // ikna oluyor, çalışma zamanı ikna olmuyor: tanınmayan bir adım
  // aşağıdaki koşulların hiçbirine uymayıp son bloğa (şifre belirleme)
  // düşüyordu. Orası ayrıca challenge çerezi istediği için sömürülebilir
  // değildi ama bu bir kaza; sabit kümeye bağlamak onu kurala çeviriyor.
  const stepSonuc = secenekAlani(formData.get("step"), "Adım", ADIMLAR, "kimlik");
  const modeSonuc = secenekAlani(formData.get("mode"), "Kip", KIPLER, "giris");
  const step: Step = stepSonuc.ok ? stepSonuc.deger : "kimlik";
  const mode: "giris" | "sifre" = modeSonuc.ok ? modeSonuc.deger : "giris";

  // --- 1. adım: kimlik doğrulama (giriş) ya da kullanıcı adı (şifre sıfırlama)
  if (step === "kimlik") {
    // Bu değer, doğrulanmadan önce İKİ kez veritabanına gidiyordu: hız
    // sınırı tablosuna anahtar olarak yazılıyor, sonra user.findUnique ile
    // aranıyordu. Sınırsızken 5 MB'lık bir "kullanıcı adı" tek istekte
    // login_attempts tablosunu şişiriyor ve sorguyu pahalılaştırıyordu.
    //
    // Biçim DENETLENMİYOR, yalnızca uzunluk: giriş ekranı, kaydedilmiş
    // olabilecek her adı kabul etmeli. Bugünün açılış kuralını burada
    // dayatmak, dünün kuralıyla açılmış hesapları kilitlerdi (bkz.
    // desenler.ts'teki `girisKimligi` gerekçesi).
    const kimlik = alanDogrula(formData.get("username"), "girisKimligi", "Kullanıcı adı");
    if (!kimlik.ok) {
      return { step: "kimlik", mode, error: kimlik.hata };
    }
    const username = kimlik.deger.toLowerCase();

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

    // Şifre uzunluğu bcrypt'e GİRMEDEN sınırlanıyor. bcrypt maliyeti
    // girdiyle birlikte artıyor ve 1 MB'lık bir "şifre" tek istekte
    // sunucuyu meşgul edebiliyordu — kimlik doğrulaması gerektirmeyen,
    // yani herkese açık bir uçta. bcrypt zaten 72 baytın ötesini yok
    // sayıyor; 128'lik sınır hiçbir gerçek parolayı kesmiyor.
    // `girisSifresi`, açılış kuralındaki ASGARİ uzunluğu dayatmıyor: daha
    // gevşek bir kuralla açılmış bir hesabı giriş ekranında reddetmek,
    // kullanıcının şifresini düzeltme yolunu da kapatırdı.
    const sifre = alanDogrula(formData.get("password"), "girisSifresi", "Şifre", {
      zorunlu: true,
    });
    if (!sifre.ok) {
      return { step: "kimlik", mode, error: "Kullanıcı adı veya şifre hatalı." };
    }
    const password = sifre.deger;

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

    // Kod altı rakam; biçimi tutmayan bir değerin veritabanındaki OTP
    // kaydına kadar gitmesine gerek yok.
    const kod = alanDogrula(formData.get("code"), "dogrulamaKodu", "Kod");
    if (!kod.ok) {
      return {
        step: "kod",
        mode,
        error: kod.hata,
        maskedPhone: String(formData.get("maskedPhone") ?? "").slice(0, 40),
      };
    }
    const purpose = challenge.purpose === "sifre" ? "sifre" : "giris";
    const sonuc = await verifyOtp(challenge.userId, purpose, kod.deger);
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
      // Jeton modül taşımaz; etkin küme her istekte DB'den okunuyor.
      moduller: [],
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

  const yeniSifre = alanDogrula(formData.get("password"), "sifre", "Şifre", {
    zorunlu: true,
  });
  if (!yeniSifre.ok) {
    return { step: "yeni-sifre", mode: "sifre", error: yeniSifre.hata };
  }
  const yeni = yeniSifre.deger;
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
