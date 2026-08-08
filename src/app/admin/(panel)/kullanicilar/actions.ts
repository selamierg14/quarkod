"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { getSession, hashPassword, requireOwner, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type UserFormState = { error?: string; saved?: string };

const MIN_PASSWORD = 8;

function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD) {
    return `Şifre en az ${MIN_PASSWORD} karakter olmalı.`;
  }
  if (/^\d+$/.test(password)) {
    return "Şifre sadece rakamlardan oluşmasın.";
  }
  return null;
}

export async function createUser(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  await requireOwner();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "");
  const businessId = String(formData.get("businessId") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!name) return { error: "Ad soyad gerekli." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Geçerli bir e-posta girin." };
  if (role !== "owner" && role !== "manager") return { error: "Rol seçin." };
  if (role === "manager" && !businessId) {
    return { error: "İşletme sorumlusu için bir işletme seçin." };
  }

  const problem = passwordProblem(password);
  if (problem) return { error: problem };

  if (await prisma.user.findUnique({ where: { email } })) {
    return { error: "Bu e-posta zaten kayıtlı." };
  }

  await prisma.user.create({
    data: {
      name,
      email,
      role,
      businessId: role === "manager" ? businessId : null,
      passwordHash: await hashPassword(password),
    },
  });

  revalidatePath("/admin/kullanicilar");
  return { saved: `${name} eklendi.` };
}

export async function resetPassword(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  await requireOwner();

  const id = String(formData.get("userId") ?? "");
  const password = String(formData.get("password") ?? "");

  const problem = passwordProblem(password);
  if (problem) return { error: problem };

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return { error: "Kullanıcı bulunamadı." };

  await prisma.user.update({
    where: { id },
    data: { passwordHash: await hashPassword(password) },
  });

  revalidatePath("/admin/kullanicilar");
  return { saved: `${user.name} için yeni şifre belirlendi.` };
}

export async function toggleUser(formData: FormData) {
  const owner = await requireOwner();
  const id = String(formData.get("userId") ?? "");

  // Patron kendi hesabını kapatıp sistemden kilitlenmesin.
  if (id === owner.id) return;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return;

  await prisma.user.update({ where: { id }, data: { active: !user.active } });
  revalidatePath("/admin/kullanicilar");
}

/** Herkes kendi şifresini değiştirebilir; mevcut şifre doğrulanır. */
export async function changeOwnPassword(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const session = await requireUser();

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const repeat = String(formData.get("repeat") ?? "");

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) return { error: "Kullanıcı bulunamadı." };

  if (!(await bcrypt.compare(current, user.passwordHash))) {
    return { error: "Mevcut şifre hatalı." };
  }
  if (next !== repeat) return { error: "Yeni şifreler birbiriyle uyuşmuyor." };

  const problem = passwordProblem(next);
  if (problem) return { error: problem };

  if (await bcrypt.compare(next, user.passwordHash)) {
    return { error: "Yeni şifre eskisiyle aynı olamaz." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(next) },
  });

  return { saved: "Şifreniz değiştirildi." };
}

/** Seed şifresini hâlâ kullanan hesap var mı — panelde uyarı göstermek için. */
export async function usesSeedPassword(userId: string): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return false;
  return bcrypt.compare("degistir123", user.passwordHash);
}
