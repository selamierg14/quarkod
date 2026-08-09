"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashPassword, requireSuperadmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { clearActiveAccount, setActiveAccount } from "@/lib/impersonation";
import { normalizePhone, toUsername, usernameProblem } from "@/lib/username";

export type AccountFormState = { error?: string; saved?: string };

/**
 * Yeni kiracı açar ve ilk sahibini oluşturur.
 *
 * İkisi tek işlemde yapılır: sahibi olmayan bir hesap kimsenin giremediği ölü
 * bir kayıttır, o yüzden yarım bırakılmasına izin vermiyoruz.
 */
export async function createAccount(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  await requireSuperadmin();

  const name = String(formData.get("name") ?? "").trim();
  const ownerName = String(formData.get("ownerName") ?? "").trim();
  const ownerEmail = String(formData.get("ownerEmail") ?? "").trim().toLowerCase();
  const ownerUsername = String(formData.get("ownerUsername") ?? "").trim().toLowerCase();
  const ownerPhone = String(formData.get("ownerPhone") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!name) return { error: "Hesap adı gerekli." };
  if (!ownerName) return { error: "Hesap sahibinin adı gerekli." };
  if (!/^\S+@\S+\.\S+$/.test(ownerEmail)) {
    return { error: "Geçerli bir e-posta girin." };
  }

  const username = ownerUsername || toUsername(ownerEmail.split("@")[0]);
  const usernameSorun = usernameProblem(username);
  if (usernameSorun) return { error: usernameSorun };

  // 2FA kodu buraya gideceği için telefon zorunlu.
  const phone = normalizePhone(ownerPhone);
  if (!phone) {
    return { error: "Hesap sahibi için geçerli bir cep telefonu girin (5XX...)." };
  }

  if (password.length < 8) {
    return { error: "Şifre en az 8 karakter olmalı." };
  }
  if (await prisma.user.findUnique({ where: { email: ownerEmail } })) {
    return { error: "Bu e-posta zaten kayıtlı." };
  }
  if (await prisma.user.findUnique({ where: { username } })) {
    return { error: `"${username}" kullanıcı adı zaten alınmış.` };
  }

  const passwordHash = await hashPassword(password);

  await prisma.account.create({
    data: {
      name,
      email: ownerEmail,
      users: {
        create: {
          name: ownerName,
          username,
          email: ownerEmail,
          phone,
          role: "owner",
          passwordHash,
        },
      },
    },
  });

  revalidatePath("/admin/hesaplar");
  return { saved: `${name} hesabı açıldı. Giriş kullanıcı adı: ${username}` };
}

/**
 * Hesabı askıya alır veya geri açar.
 *
 * Askıya alınan hesabın kullanıcıları panele giremez ve QR'ları çalışmaz —
 * ama verisi silinmez, ödeme yapılınca kaldığı yerden devam eder.
 */
/** Platform yöneticisi bir hesabın paneline geçer. */
export async function enterAccount(formData: FormData) {
  await requireSuperadmin();
  const id = String(formData.get("accountId") ?? "");
  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) return;

  await setActiveAccount(account.id);
  redirect("/admin");
}

/** Görüntülemeden çıkar; superadmin yeniden tüm hesapları görür. */
export async function exitAccount() {
  await requireSuperadmin();
  await clearActiveAccount();
  redirect("/admin/hesaplar");
}

export async function toggleAccount(formData: FormData) {
  await requireSuperadmin();

  const id = String(formData.get("accountId") ?? "");
  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) return;

  await prisma.account.update({
    where: { id },
    data: { active: !account.active },
  });

  revalidatePath("/admin/hesaplar");
}
