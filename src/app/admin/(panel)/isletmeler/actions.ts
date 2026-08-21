"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  actingAccountId,
  canAccessBusiness,
  hashPassword,
  requireOwner,
  requireYazma,
} from "@/lib/auth";
import { denetimYaz } from "@/lib/denetim";
import { secenekleriAyristir, secenekleriBirlestir } from "@/lib/anket-detay";
import { sifreSorunu } from "@/lib/sifre";
import { prisma } from "@/lib/db";
import { BUSINESS_TYPES, DEFAULT_CATEGORIES, type BusinessType } from "@/lib/constants";
import { validateImageDataUrl } from "@/lib/image";
import { normalizePhone, toUsername, usernameProblem } from "@/lib/username";
import { slugIleOlustur, slugify } from "@/lib/slug";

export type FormState = { error?: string; saved?: boolean };

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
  await requireYazma();

  // Yeni işletme, işlem yapılan hesaba bağlanır. Platform yöneticisi için bu,
  // Hesaplar sayfasından "geçtiği" hesaptır; hiçbir hesaba geçmemişse hangi
  // kiracıya ait olacağı belirsiz kalır ve işlem reddedilir.
  const accountId = await actingAccountId(user);
  if (!accountId) {
    return {
      error:
        "Önce Hesaplar sayfasından bir hesaba geçin; işletme o hesaba açılacak.",
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
  const managerUsername = String(formData.get("managerUsername") ?? "").trim().toLowerCase();
  const managerPhone = String(formData.get("managerPhone") ?? "").trim();
  const managerPassword = String(formData.get("managerPassword") ?? "");
  const wantsManager = Boolean(managerName || managerEmail || managerPassword);

  let username = "";
  let phone: string | null = null;

  if (wantsManager) {
    if (!managerName) return { error: "Sorumlu için ad soyad girin." };
    if (!/^\S+@\S+\.\S+$/.test(managerEmail)) {
      return { error: "Sorumlu için geçerli bir e-posta girin." };
    }
    const sifreHatasi = sifreSorunu(managerPassword);
    if (sifreHatasi) return { error: `Sorumlu şifresi: ${sifreHatasi}` };

    username = managerUsername || toUsername(managerEmail.split("@")[0]);
    const usernameSorun = usernameProblem(username);
    if (usernameSorun) return { error: usernameSorun };

    phone = normalizePhone(managerPhone);
    if (!phone) {
      return { error: "Sorumlu için geçerli bir cep telefonu girin (5XX...)." };
    }

    if (await prisma.user.findUnique({ where: { email: managerEmail } })) {
      return { error: "Bu e-posta zaten kayıtlı." };
    }
    if (await prisma.user.findUnique({ where: { username } })) {
      return { error: `"${username}" kullanıcı adı zaten alınmış.` };
    }
  }

  if (!slugify(name)) {
    return { error: "İşletme adından geçerli bir adres üretilemedi." };
  }

  // Adres, karekodun içindeki yolun kendisi. Aynı adı iki kişi aynı anda
  // yazsa bile ikisi ayrı adres almalı; kararı veritabanına bırakıp
  // çakışınca yeniden deniyoruz (bkz. src/lib/slug.ts).
  const business = await slugIleOlustur(name, (slug) =>
    prisma.business.create({
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
          create: DEFAULT_CATEGORIES[type as BusinessType].map(
            (categoryName, index) => ({ name: categoryName, sortOrder: index }),
          ),
        },
        tables: {
          create: Array.from({ length: tableCount }, (_, index) => ({
            tableNumber: String(index + 1),
            qrToken: newQrToken(),
          })),
        },
      },
    }),
  );

  if (wantsManager) {
    await prisma.user.create({
      data: {
        accountId,
        name: managerName,
        username,
        email: managerEmail,
        phone,
        role: "manager",
        businessId: business.id,
        passwordHash: await hashPassword(managerPassword),
      },
    });
  }

  await denetimYaz(user, "business.create", {
    entity: "business",
    entityId: business.id,
    detail: `${business.name} açıldı`,
    accountId: business.accountId,
  });

  revalidatePath("/admin/isletmeler");
  revalidatePath("/admin/kullanicilar");
  redirect(`/admin/isletmeler/${business.id}`);
}

export async function updateBusiness(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireYazma();
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

  const instagramUrl = String(formData.get("instagramUrl") ?? "").trim();
  if (instagramUrl && !/^https?:\/\//i.test(instagramUrl)) {
    return { error: "Instagram linki http:// veya https:// ile başlamalı." };
  }

  const wifiSsid = String(formData.get("wifiSsid") ?? "").trim();
  const wifiPassword = String(formData.get("wifiPassword") ?? "").trim();

  // Sipariş platformu linkleri: her biri isteğe bağlı, doluysa http(s) olmalı.
  const siparisAlanlari = ["yemeksepetiUrl", "getirUrl", "trendyolUrl", "migrosUrl"] as const;
  const siparisLinkleri: Record<string, string | null> = {};
  for (const alan of siparisAlanlari) {
    const deger = String(formData.get(alan) ?? "").trim();
    if (deger && !/^https?:\/\//i.test(deger)) {
      return { error: "Sipariş linkleri http:// veya https:// ile başlamalı." };
    }
    siparisLinkleri[alan] = deger || null;
  }

  // Görseller data URI olarak gelir; boş dize "kaldır" demek. Sunucu boyut ve
  // biçimi yeniden doğrular — tarayıcının küçültmesine güvenmiyoruz.
  const rawLogo = String(formData.get("logoUrl") ?? "");
  const rawCover = String(formData.get("coverUrl") ?? "");

  const logoUrl = rawLogo ? rawLogo : null;
  const coverUrl = rawCover ? rawCover : null;

  if (logoUrl) {
    const problem = validateImageDataUrl(logoUrl, "logo");
    if (problem) return { error: `Logo: ${problem}` };
  }
  if (coverUrl) {
    const problem = validateImageDataUrl(coverUrl, "cover");
    if (problem) return { error: `Kapak: ${problem}` };
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
      iysBrandCode: String(formData.get("iysBrandCode") ?? "").trim() || null,
      logoUrl,
      coverUrl,
      instagramUrl: instagramUrl || null,
      wifiSsid: wifiSsid || null,
      wifiPassword: wifiPassword || null,
      announcement:
        String(formData.get("announcement") ?? "").trim().slice(0, 120) || null,
      announcementActive: formData.get("announcementActive") === "on",
      yemeksepetiUrl: siparisLinkleri.yemeksepetiUrl,
      getirUrl: siparisLinkleri.getirUrl,
      trendyolUrl: siparisLinkleri.trendyolUrl,
      migrosUrl: siparisLinkleri.migrosUrl,
    },
  });

  await denetimYaz(user, "business.update", {
    entity: "business",
    entityId: id,
    detail: `${name} ayarları güncellendi`,
  });

  revalidatePath(`/admin/isletmeler/${id}`);
  revalidatePath("/admin/isletmeler");
  return { saved: true };
}

export async function addCategory(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireYazma();
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

  await denetimYaz(user, "business.category", {
    entity: "business",
    entityId: businessId,
    detail: `Kategori eklendi: ${name}`,
  });

  revalidatePath(`/admin/isletmeler/${businessId}`);
  return { saved: true };
}

/**
 * Kategoriye düşük puan verildiğinde sorulacak seçenekleri günceller.
 *
 * Boş bırakılırsa kategori adına göre akıllı varsayılana geri dönülür
 * (bkz. src/lib/anket-detay.ts) — "temizledim, artık hiç sorulmasın"
 * demek isteyen için ise seçenekleri tek tek silmek yerine kategoriyi
 * kapatmak doğru yol.
 */
export async function updateCategoryProblems(formData: FormData) {
  const user = await requireYazma();
  const id = String(formData.get("categoryId") ?? "");

  const category = await prisma.categoryTemplate.findUnique({ where: { id } });
  if (!category || !(await canAccessBusiness(user, category.businessId))) return;

  const problemOptions = secenekleriBirlestir(
    secenekleriAyristir(String(formData.get("problemOptions") ?? "")),
  );

  await prisma.categoryTemplate.update({ where: { id }, data: { problemOptions } });
  await denetimYaz(user, "business.category", {
    entity: "business",
    entityId: category.businessId,
    detail: `${category.name} sorun seçenekleri güncellendi`,
  });

  revalidatePath(`/admin/isletmeler/${category.businessId}`);
  revalidatePath("/admin/profil");
}

export async function toggleCategory(formData: FormData) {
  const user = await requireYazma();
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
  const user = await requireYazma();
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
  //
  // Tek transaction: yarıda kalan bir yeniden sıralama, iki kategoriye aynı
  // sortOrder'ı bırakıp listeyi kalıcı olarak karıştırırdı ve bunu ancak
  // müşteri anketi tuhaf sırada görünce fark ederdik. Ya hepsi ya hiçbiri.
  const reordered = [...siblings];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
  await prisma.$transaction(
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
  const user = await requireYazma();
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

  await denetimYaz(user, "business.table", {
    entity: "business",
    entityId: businessId,
    detail: `${added} masa eklendi`,
  });

  revalidatePath(`/admin/isletmeler/${businessId}/masalar`);
  return added > 0
    ? { saved: true }
    : { error: "Girilen masaların hepsi zaten tanımlı." };
}

/**
 * Masa kavramı olmayan işletmeler için tek ortak QR.
 *
 * Gece kulübü, büfe, kuaför gibi yerlerde "masa 7" diye bir şey yok; tek bir
 * kod basılıp kapıya/kasaya asılıyor. Bunu masa listesine "giriş" adında tek
 * bir kayıt olarak yazıyoruz — raporlar zaten masa alanı boş olan kayıtları
 * tolere ediyor, ayrı bir veri modeli gerekmiyor.
 */
export async function tekQrOlustur(formData: FormData): Promise<void> {
  const user = await requireYazma();
  const businessId = String(formData.get("businessId") ?? "");
  if (!(await canAccessBusiness(user, businessId))) return;

  const mevcut = await prisma.table.findFirst({
    where: { businessId, isEntrance: true },
  });
  if (mevcut) {
    if (!mevcut.active) {
      await prisma.table.update({ where: { id: mevcut.id }, data: { active: true } });
    }
    revalidatePath(`/admin/isletmeler/${businessId}/masalar`);
    return;
  }

  await prisma.table.create({
    data: {
      businessId,
      tableNumber: "giris",
      isEntrance: true,
      qrToken: newQrToken(),
    },
  });

  await denetimYaz(user, "business.table", {
    entity: "business",
    entityId: businessId,
    detail: "Tek ortak QR oluşturuldu",
  });

  revalidatePath(`/admin/isletmeler/${businessId}/masalar`);
}

export async function toggleTable(formData: FormData) {
  const user = await requireYazma();
  const id = String(formData.get("tableId") ?? "");

  const table = await prisma.table.findUnique({ where: { id } });
  if (!table || !await canAccessBusiness(user, table.businessId)) return;

  await prisma.table.update({ where: { id }, data: { active: !table.active } });
  await denetimYaz(user, "business.table", {
    entity: "table",
    entityId: id,
    detail: `Masa ${table.tableNumber} ${table.active ? "kapatıldı" : "açıldı"}`,
  });
  revalidatePath(`/admin/isletmeler/${table.businessId}`);
}
