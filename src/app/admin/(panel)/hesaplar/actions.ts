"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashPassword, requireSuperadmin } from "@/lib/auth";
import { denetimYaz } from "@/lib/denetim";
import { prisma } from "@/lib/db";
import { clearActiveAccount, setActiveAccount } from "@/lib/impersonation";
import { normalizePhone, toUsername, usernameProblem } from "@/lib/username";
import { uniqueConstraintMessage } from "@/lib/unique-error";
import { tarihGirdisi } from "@/lib/abonelik";

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
  const actor = await requireSuperadmin();

  const name = String(formData.get("name") ?? "").trim();
  const ownerName = String(formData.get("ownerName") ?? "").trim();
  const ownerEmail = String(formData.get("ownerEmail") ?? "").trim().toLowerCase();
  const ownerUsername = String(formData.get("ownerUsername") ?? "").trim().toLowerCase();
  const ownerPhone = String(formData.get("ownerPhone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  // Hesabın geçerlilik tarihi açılışta veriliyor: "önce açalım sonra süre
  // koyarız" unutuluyor ve süresiz hesap kalıyordu.
  const expiresAt = tarihGirdisi(String(formData.get("expiresAt") ?? ""));

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
  if (expiresAt === undefined) {
    return { error: "Geçerlilik tarihi hatalı. Takvimden seçin ya da boş bırakın." };
  }
  if (await prisma.user.findUnique({ where: { email: ownerEmail } })) {
    return { error: "Bu e-posta zaten kayıtlı." };
  }
  if (await prisma.user.findUnique({ where: { username } })) {
    return { error: `"${username}" kullanıcı adı zaten alınmış.` };
  }

  const passwordHash = await hashPassword(password);

  let yeniHesapId: string | null = null;
  try {
    const olusan = await prisma.account.create({
    data: {
      name,
      email: ownerEmail,
      expiresAt,
      menuEnabled: formData.get("menuEnabled") === "on",
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
    yeniHesapId = olusan.id;
  } catch (error) {
    const mesaj = uniqueConstraintMessage(error);
    if (mesaj) return { error: mesaj };
    throw error;
  }

  await denetimYaz(actor, "account.create", {
    accountId: yeniHesapId,
    entity: "account",
    entityId: yeniHesapId ?? undefined,
    detail: `${name} hesabı açıldı (sahip: ${ownerName})`,
  });

  revalidatePath("/admin/hesaplar");
  return {
    saved: expiresAt
      ? `${name} hesabı açıldı (${expiresAt.toLocaleDateString("tr-TR")} tarihine kadar geçerli). Giriş kullanıcı adı: ${username}`
      : `${name} hesabı açıldı — süresiz. Giriş kullanıcı adı: ${username}`,
  };
}

/**
 * Hesabı askıya alır veya geri açar.
 *
 * Askıya alınan hesabın kullanıcıları panele giremez ve QR'ları çalışmaz —
 * ama verisi silinmez, ödeme yapılınca kaldığı yerden devam eder.
 */
/** Platform yöneticisi bir hesabın paneline geçer. */
export async function enterAccount(formData: FormData) {
  const actor = await requireSuperadmin();
  const id = String(formData.get("accountId") ?? "");
  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) return;

  // Bu kaydın önemi diğerlerinden fazla: müşterinin verisine platform
  // ekibinden birinin girdiği an burada iz bırakır.
  await denetimYaz(actor, "account.enter", {
    accountId: account.id,
    entity: "account",
    entityId: account.id,
    detail: `${account.name} hesabına giriş yapıldı`,
  });

  await setActiveAccount(account.id);
  redirect("/admin");
}

/** Görüntülemeden çıkar; superadmin yeniden tüm hesapları görür. */
export async function exitAccount() {
  const actor = await requireSuperadmin();
  await denetimYaz(actor, "account.exit", { detail: "Hesap görüntülemeden çıkıldı" });
  await clearActiveAccount();
  redirect("/admin/hesaplar");
}

export async function toggleAccount(formData: FormData) {
  const actor = await requireSuperadmin();

  const id = String(formData.get("accountId") ?? "");
  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) return;

  await prisma.account.update({
    where: { id },
    data: { active: !account.active },
  });

  await denetimYaz(actor, "account.toggle", {
    accountId: id,
    entity: "account",
    entityId: id,
    detail: `${account.name} ${account.active ? "askıya alındı" : "yeniden aktifleştirildi"}`,
  });

  revalidatePath("/admin/hesaplar");
}

/**
 * Aboneliğin bitiş tarihi ve satılan modüller.
 *
 * Tarih girilmezse hesap süresizdir. Süre dolduğunda hesap `active` alanına
 * bakılmadan kapanır — elle askıya almayı beklemeye gerek kalmasın diye.
 */
export async function updateSubscription(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const actor = await requireSuperadmin();

  const id = String(formData.get("accountId") ?? "");
  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) return { error: "Hesap bulunamadı." };

  const expiresAt = tarihGirdisi(String(formData.get("expiresAt") ?? ""));
  if (expiresAt === undefined) {
    return { error: "Tarih geçersiz. Takvimden seçin ya da boş bırakın." };
  }

  await prisma.account.update({
    where: { id },
    data: { expiresAt, menuEnabled: formData.get("menuEnabled") === "on" },
  });

  await denetimYaz(actor, "account.subscription", {
    accountId: id,
    entity: "account",
    entityId: id,
    detail: expiresAt
      ? `Geçerlilik: ${expiresAt.toLocaleDateString("tr-TR")}`
      : "Geçerlilik: süresiz",
  });

  revalidatePath("/admin/hesaplar");
  return {
    saved: expiresAt
      ? `${account.name}: abonelik ${expiresAt.toLocaleDateString("tr-TR")} tarihine kadar.`
      : `${account.name}: süresiz abonelik.`,
  };
}
