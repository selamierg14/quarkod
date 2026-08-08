"use server";

import { revalidatePath } from "next/cache";
import { hashPassword, requireSuperadmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
  const password = String(formData.get("password") ?? "");

  if (!name) return { error: "Hesap adı gerekli." };
  if (!ownerName) return { error: "Hesap sahibinin adı gerekli." };
  if (!/^\S+@\S+\.\S+$/.test(ownerEmail)) {
    return { error: "Geçerli bir e-posta girin." };
  }
  if (password.length < 8) {
    return { error: "Şifre en az 8 karakter olmalı." };
  }
  if (await prisma.user.findUnique({ where: { email: ownerEmail } })) {
    return { error: "Bu e-posta zaten kayıtlı." };
  }

  const passwordHash = await hashPassword(password);

  await prisma.account.create({
    data: {
      name,
      email: ownerEmail,
      users: {
        create: {
          name: ownerName,
          email: ownerEmail,
          role: "owner",
          passwordHash,
        },
      },
    },
  });

  revalidatePath("/admin/hesaplar");
  return { saved: `${name} hesabı açıldı. Sahibi: ${ownerEmail}` };
}

/**
 * Hesabı askıya alır veya geri açar.
 *
 * Askıya alınan hesabın kullanıcıları panele giremez ve QR'ları çalışmaz —
 * ama verisi silinmez, ödeme yapılınca kaldığı yerden devam eder.
 */
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
