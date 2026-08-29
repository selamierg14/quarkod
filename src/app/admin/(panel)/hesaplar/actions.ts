"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashPassword, requireSuperadmin } from "@/lib/auth";
import { denetimYaz } from "@/lib/denetim";
import { prisma } from "@/lib/db";
import { istenenModulleriSuz } from "@/lib/moduller";
import { clearActiveAccount, setActiveAccount } from "@/lib/impersonation";
import { normalizePhone, toUsername, usernameProblem } from "@/lib/username";
import { uniqueConstraintMessage } from "@/lib/unique-error";
import { tarihGirdisi } from "@/lib/abonelik";
import { sifreSorunu } from "@/lib/sifre";
import { parsePrice, formatPrice } from "@/lib/menu";

export type AccountFormState = { error?: string; saved?: string };

/** Aboneliği uzatmak için izin verilen ay seçenekleri. 0 = sadece kaydet. */
const UZATMA_AYLARI = [0, 1, 3, 6, 12];

/**
 * Bir aboneliğe ödeme işler ve isteğe bağlı olarak süreyi uzatır.
 *
 * Ödeme ve uzatma tek transaction: uzatma yazılıp ödeme kaydı düşmezse (ya da
 * tersi) hesabın gelir geçmişi tutarsız kalırdı. Uzatma, hesabın kalan
 * süresine eklenir — süresi henüz dolmadıysa müşteri hakkını kaybetmesin;
 * dolduysa bugünden başlar.
 */
export async function recordPayment(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const actor = await requireSuperadmin();

  const accountId = String(formData.get("accountId") ?? "");
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) return { error: "Hesap bulunamadı." };

  const amountKurus = parsePrice(String(formData.get("amount") ?? ""));
  if (amountKurus === undefined) {
    return { error: "Tutar anlaşılmadı. Örnek: 1290 ya da 1290,00" };
  }
  if (amountKurus === null || amountKurus <= 0) {
    return { error: "Sıfırdan büyük bir tutar girin." };
  }

  const ay = Number(formData.get("uzatmaAy") ?? "0");
  if (!UZATMA_AYLARI.includes(ay)) {
    return { error: "Geçersiz uzatma süresi." };
  }

  const note = String(formData.get("note") ?? "").trim().slice(0, 200) || null;

  // Uzatma tabanı: kalan süre varsa onun üstüne, yoksa bugünden.
  let extendedTo: Date | null = null;
  if (ay > 0) {
    const simdi = new Date();
    const taban =
      account.expiresAt && account.expiresAt > simdi ? account.expiresAt : simdi;
    extendedTo = new Date(taban);
    extendedTo.setMonth(extendedTo.getMonth() + ay);
    // Ay sonu taşması ("31 Ocak + 1 ay") gün kaydırmasın diye gün sonuna sabitle.
    extendedTo.setHours(23, 59, 59, 999);
  }

  await prisma.$transaction([
    prisma.payment.create({
      data: {
        accountId,
        amountKurus,
        note,
        extendedTo,
        recordedBy: actor.name,
      },
    }),
    ...(extendedTo
      ? [
          prisma.account.update({
            where: { id: accountId },
            data: { expiresAt: extendedTo },
          }),
        ]
      : []),
  ]);

  await denetimYaz(actor, "account.payment", {
    accountId,
    entity: "account",
    entityId: accountId,
    detail: extendedTo
      ? `${formatPrice(amountKurus)} · ${ay} ay uzatıldı (→ ${extendedTo.toLocaleDateString("tr-TR")})`
      : `${formatPrice(amountKurus)} · uzatma yok`,
  });

  revalidatePath("/admin/abonelikler");
  revalidatePath("/admin/hesaplar");
  return { saved: `${formatPrice(amountKurus)} ödeme kaydedildi.` };
}

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

  const sifreHatasi = sifreSorunu(password);
  if (sifreHatasi) return { error: sifreHatasi };
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

  const iysCode = String(formData.get("iysCode") ?? "").trim();

  // Platform yöneticisi kısıtsız dağıtabilir; süzgeç yine de geçiyor ki
  // tanınmayan bir anahtar veritabanına yazılmasın.
  const moduller = istenenModulleriSuz(
    actor.role,
    actor.moduller,
    formData.getAll("moduller").map((v) => String(v)),
  );

  await prisma.$transaction([
    prisma.account.update({
      where: { id },
      data: {
        expiresAt,
        // Müşteri karşılama ekranı bu bayrağa bakıyor (bkz. menu/_secim.ts);
        // "menu" modülüyle birlikte yürüsün diye senkron tutuluyor, yoksa
        // panelde açık görünen menü müşteri tarafında kapalı kalırdı.
        menuEnabled: moduller.includes("menu"),
        iysCode: iysCode || null,
      },
    }),
    // Modüller hesabın SAHİPLERİNE veriliyor; patron bunları kendi ekibine
    // dağıtıyor. Ekip üyelerine dokunulmuyor: patronun daha önce kısıtladığı
    // bir sorumlunun izinleri, hesap ayarı kaydedilince sıfırlanmamalı.
    prisma.user.updateMany({
      where: { accountId: id, role: "owner" },
      data: { moduller },
    }),
  ]);

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
