"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canAccessBusiness, hashPassword, requireOwner, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BUSINESS_TYPES, DEFAULT_CATEGORIES, type BusinessType } from "@/lib/constants";

export type FormState = { error?: string; saved?: boolean };

function slugify(value: string): string {
  const map: Record<string, string> = {
    ç: "c", Ç: "c", ğ: "g", Ğ: "g", ı: "i", İ: "i",
    ö: "o", Ö: "o", ş: "s", Ş: "s", ü: "u", Ü: "u",
  };
  return value
    .split("")
    .map((char) => map[char] ?? char)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function newQrToken(): string {
  return randomBytes(9).toString("base64url");
}

/**
 * Yeni işletme ekleme sihirbazı: tür seçilince kategori şablonu otomatik
 * oluşturulur ve istenen sayıda masa + QR üretilir.
 */
export async function createBusiness(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireOwner();

  // Yeni işletme her zaman açan kişinin hesabına bağlanır. Platform yöneticisi
  // panelden işletme açamaz; hesap seçmeden hangi kiracıya ait olacağı belirsiz
  // kalır (o akış /admin/hesaplar üzerinden yürür).
  const accountId = user.accountId;
  if (!accountId) {
    return {
      error:
        "Platform yöneticisi doğrudan işletme açamaz. Hesaplar sayfasından ilgili hesabın sahibiyle ilerleyin.",
    };
  }

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const tableCount = Number(formData.get("tableCount") ?? 0);

  if (!name) return { error: "İşletme adı gerekli." };
  if (!(type in BUSINESS_TYPES)) return { error: "Geçerli bir işletme türü seçin." };
  if (!Number.isInteger(tableCount) || tableCount < 0 || tableCount > 300) {
    return { error: "Masa sayısı 0-300 arasında olmalı." };
  }

  // Sorumlu hesabı isteğe bağlı; girilirse işletmeyle birlikte açılır ki
  // yeni işletmenin sorumlusu ilk günden panele girebilsin.
  const managerName = String(formData.get("managerName") ?? "").trim();
  const managerEmail = String(formData.get("managerEmail") ?? "").trim().toLowerCase();
  const managerPassword = String(formData.get("managerPassword") ?? "");
  const wantsManager = Boolean(managerName || managerEmail || managerPassword);

  if (wantsManager) {
    if (!managerName) return { error: "Sorumlu için ad soyad girin." };
    if (!/^\S+@\S+\.\S+$/.test(managerEmail)) {
      return { error: "Sorumlu için geçerli bir e-posta girin." };
    }
    if (managerPassword.length < 8) {
      return { error: "Sorumlu şifresi en az 8 karakter olmalı." };
    }
    if (await prisma.user.findUnique({ where: { email: managerEmail } })) {
      return { error: "Bu e-posta zaten kayıtlı." };
    }
  }

  let slug = slugify(name);
  if (!slug) return { error: "İşletme adından geçerli bir adres üretilemedi." };
  if (await prisma.business.findUnique({ where: { slug } })) {
    slug = `${slug}-${randomBytes(2).toString("hex")}`;
  }

  const business = await prisma.business.create({
    data: {
      accountId,
      slug,
      name,
      type,
      address: String(formData.get("address") ?? "").trim() || null,
      googleReviewUrl: String(formData.get("googleReviewUrl") ?? "").trim() || null,
      brandColor: String(formData.get("brandColor") ?? "#111827"),
      notifyThreshold: Number(formData.get("notifyThreshold") ?? 3),
      categories: {
        create: DEFAULT_CATEGORIES[type as BusinessType].map((categoryName, index) => ({
          name: categoryName,
          sortOrder: index,
        })),
      },
      tables: {
        create: Array.from({ length: tableCount }, (_, index) => ({
          tableNumber: String(index + 1),
          qrToken: newQrToken(),
        })),
      },
    },
  });

  if (wantsManager) {
    await prisma.user.create({
      data: {
        accountId,
        name: managerName,
        email: managerEmail,
        role: "manager",
        businessId: business.id,
        passwordHash: await hashPassword(managerPassword),
      },
    });
  }

  revalidatePath("/admin/isletmeler");
  revalidatePath("/admin/kullanicilar");
  redirect(`/admin/isletmeler/${business.id}`);
}

export async function updateBusiness(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");

  if (!await canAccessBusiness(user, id)) return { error: "Yetkiniz yok." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "İşletme adı gerekli." };

  const threshold = Number(formData.get("notifyThreshold") ?? 3);
  if (!Number.isInteger(threshold) || threshold < 1 || threshold > 5) {
    return { error: "Bildirim eşiği 1-5 arasında olmalı." };
  }

  const googleReviewUrl = String(formData.get("googleReviewUrl") ?? "").trim();
  if (googleReviewUrl && !/^https?:\/\//i.test(googleReviewUrl)) {
    return { error: "Google linki http:// veya https:// ile başlamalı." };
  }

  await prisma.business.update({
    where: { id },
    data: {
      name,
      // Tür değişimi sadece patronun yetkisinde; sorumlu formu göndermez.
      ...(user.role === "owner" && formData.get("type")
        ? { type: String(formData.get("type")) }
        : {}),
      address: String(formData.get("address") ?? "").trim() || null,
      googleReviewUrl: googleReviewUrl || null,
      brandColor: String(formData.get("brandColor") ?? "#111827"),
      notifyThreshold: threshold,
      googleRedirect: formData.get("googleRedirect") === "on",
      qrCardText: String(formData.get("qrCardText") ?? "").trim().slice(0, 80) || null,
    },
  });

  revalidatePath(`/admin/isletmeler/${id}`);
  revalidatePath("/admin/isletmeler");
  return { saved: true };
}

export async function addCategory(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const businessId = String(formData.get("businessId") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!await canAccessBusiness(user, businessId)) return { error: "Yetkiniz yok." };
  if (!name) return { error: "Kategori adı gerekli." };

  const existing = await prisma.categoryTemplate.findUnique({
    where: { businessId_name: { businessId, name } },
  });
  if (existing) {
    // Daha önce kapatılmış bir kategori tekrar açılabilir.
    await prisma.categoryTemplate.update({
      where: { id: existing.id },
      data: { active: true },
    });
  } else {
    const count = await prisma.categoryTemplate.count({ where: { businessId } });
    await prisma.categoryTemplate.create({
      data: { businessId, name, sortOrder: count },
    });
  }

  revalidatePath(`/admin/isletmeler/${businessId}`);
  return { saved: true };
}

export async function toggleCategory(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("categoryId") ?? "");

  const category = await prisma.categoryTemplate.findUnique({ where: { id } });
  if (!category || !await canAccessBusiness(user, category.businessId)) return;

  await prisma.categoryTemplate.update({
    where: { id },
    data: { active: !category.active },
  });

  revalidatePath(`/admin/isletmeler/${category.businessId}`);
}

export async function moveCategory(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("categoryId") ?? "");
  const direction = String(formData.get("direction") ?? "");

  const category = await prisma.categoryTemplate.findUnique({ where: { id } });
  if (!category || !await canAccessBusiness(user, category.businessId)) return;

  const siblings = await prisma.categoryTemplate.findMany({
    where: { businessId: category.businessId },
    orderBy: { sortOrder: "asc" },
  });
  const index = siblings.findIndex((c) => c.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= siblings.length) return;

  // Sıra numaralarını baştan yazmak, eşit sortOrder'ları da düzeltir.
  const reordered = [...siblings];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
  await Promise.all(
    reordered.map((item, order) =>
      prisma.categoryTemplate.update({
        where: { id: item.id },
        data: { sortOrder: order },
      }),
    ),
  );

  revalidatePath(`/admin/isletmeler/${category.businessId}`);
}

export async function addTables(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const businessId = String(formData.get("businessId") ?? "");
  if (!await canAccessBusiness(user, businessId)) return { error: "Yetkiniz yok." };

  const raw = String(formData.get("tableNumbers") ?? "").trim();
  const isEntrance = formData.get("isEntrance") === "on";

  // Hem "1-20" aralığı hem "VIP-1, VIP-2" listesi kabul edilir.
  let numbers: string[];
  const range = raw.match(/^(\d+)\s*-\s*(\d+)$/);
  if (range) {
    const start = Number(range[1]);
    const end = Number(range[2]);
    if (end < start || end - start > 300) {
      return { error: "Aralık geçersiz veya çok geniş (en fazla 300 masa)." };
    }
    numbers = Array.from({ length: end - start + 1 }, (_, i) => String(start + i));
  } else {
    numbers = raw
      .split(/[,\n]/)
      .map((value) => value.trim())
      .filter(Boolean);
  }

  if (numbers.length === 0) {
    return { error: 'Masa numarası girin (örn. "1-20" veya "VIP-1, VIP-2").' };
  }

  let added = 0;
  for (const tableNumber of numbers) {
    const existing = await prisma.table.findUnique({
      where: { businessId_tableNumber: { businessId, tableNumber } },
    });
    if (existing) {
      if (!existing.active) {
        await prisma.table.update({ where: { id: existing.id }, data: { active: true } });
      }
      continue;
    }
    await prisma.table.create({
      data: { businessId, tableNumber, isEntrance, qrToken: newQrToken() },
    });
    added += 1;
  }

  revalidatePath(`/admin/isletmeler/${businessId}`);
  return added > 0
    ? { saved: true }
    : { error: "Girilen masaların hepsi zaten tanımlı." };
}

export async function toggleTable(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("tableId") ?? "");

  const table = await prisma.table.findUnique({ where: { id } });
  if (!table || !await canAccessBusiness(user, table.businessId)) return;

  await prisma.table.update({ where: { id }, data: { active: !table.active } });
  revalidatePath(`/admin/isletmeler/${table.businessId}`);
}
