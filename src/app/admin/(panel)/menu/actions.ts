"use server";

import { revalidatePath } from "next/cache";
import { canAccessBusiness, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { validateImageDataUrl } from "@/lib/image";
import { parsePrice, serializeTags } from "@/lib/menu";
import { uniqueConstraintMessage } from "@/lib/unique-error";
import { menuAcikMi } from "@/lib/menu-erisim";

export type MenuFormState = { error?: string; saved?: string };

/**
 * Menü işlemlerinde ortak kapı.
 *
 * İki şeyi birden doğrular: kullanıcı bu işletmeye erişebiliyor mu ve
 * hesabın menü modülü açık mı. İkincisi olmadan, modülü satın almamış bir
 * müşteri ekranı göremese de doğrudan action çağırarak menü kurabilirdi.
 */
async function menuIzni(businessId: string): Promise<string | null> {
  const user = await requireUser();
  if (!businessId || !(await canAccessBusiness(user, businessId))) {
    return "Bu işletme için yetkiniz yok.";
  }
  if (!(await menuAcikMi(businessId))) {
    return "QR menü modülü bu hesapta açık değil.";
  }
  return null;
}

function yenile() {
  revalidatePath("/admin/menu");
}

/* --------------------------------------------------------------- kategori */

export async function addMenuCategory(
  _prev: MenuFormState,
  formData: FormData,
): Promise<MenuFormState> {
  const businessId = String(formData.get("businessId") ?? "");
  const hata = await menuIzni(businessId);
  if (hata) return { error: hata };

  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  if (!name) return { error: "Bölüm adı gerekli." };

  const son = await prisma.menuCategory.findFirst({
    where: { businessId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  try {
    await prisma.menuCategory.create({
      data: { businessId, name, sortOrder: (son?.sortOrder ?? 0) + 10 },
    });
  } catch (error) {
    const mesaj = uniqueConstraintMessage(error);
    if (mesaj) return { error: `"${name}" bölümü zaten var.` };
    throw error;
  }

  yenile();
  return { saved: `${name} bölümü eklendi.` };
}

export async function renameMenuCategory(formData: FormData) {
  const id = String(formData.get("categoryId") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const kategori = await prisma.menuCategory.findUnique({ where: { id } });
  if (!kategori || !name) return;
  if (await menuIzni(kategori.businessId)) return;

  await prisma.menuCategory.update({ where: { id }, data: { name } }).catch(() => {});
  yenile();
}

export async function toggleMenuCategory(formData: FormData) {
  const id = String(formData.get("categoryId") ?? "");
  const kategori = await prisma.menuCategory.findUnique({ where: { id } });
  if (!kategori) return;
  if (await menuIzni(kategori.businessId)) return;

  // Bölüm kapatılınca içindeki ürünler de menüde görünmez; kayıt silinmez,
  // mevsimlik bölümler (yaz menüsü) yıl boyunca saklanabilsin diye.
  await prisma.menuCategory.update({
    where: { id },
    data: { active: !kategori.active },
  });
  yenile();
}

export async function moveMenuCategory(formData: FormData) {
  const id = String(formData.get("categoryId") ?? "");
  const yon = String(formData.get("direction") ?? "");
  const kategori = await prisma.menuCategory.findUnique({ where: { id } });
  if (!kategori) return;
  if (await menuIzni(kategori.businessId)) return;

  const komsu = await prisma.menuCategory.findFirst({
    where: {
      businessId: kategori.businessId,
      sortOrder: yon === "up" ? { lt: kategori.sortOrder } : { gt: kategori.sortOrder },
    },
    orderBy: { sortOrder: yon === "up" ? "desc" : "asc" },
  });
  if (!komsu) return;

  await prisma.$transaction([
    prisma.menuCategory.update({
      where: { id: kategori.id },
      data: { sortOrder: komsu.sortOrder },
    }),
    prisma.menuCategory.update({
      where: { id: komsu.id },
      data: { sortOrder: kategori.sortOrder },
    }),
  ]);
  yenile();
}

/* ------------------------------------------------------------------ ürün */

/** Form alanlarını okur; sorun varsa Türkçe mesaj döner. */
function urunAlanlari(formData: FormData):
  | { ok: true; veri: {
      name: string;
      description: string | null;
      priceKurus: number | null;
      imageUrl: string | null;
      tags: string | null;
    } }
  | { ok: false; error: string } {
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  if (!name) return { ok: false, error: "Ürün adı gerekli." };

  const description = String(formData.get("description") ?? "").trim().slice(0, 300);

  const priceKurus = parsePrice(String(formData.get("price") ?? ""));
  if (priceKurus === undefined) {
    return { ok: false, error: "Fiyat anlaşılmadı. Örnek: 149,90" };
  }

  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  if (imageUrl) {
    const gorselHatasi = validateImageDataUrl(imageUrl, "menu");
    if (gorselHatasi) return { ok: false, error: gorselHatasi };
  }

  return {
    ok: true,
    veri: {
      name,
      description: description || null,
      priceKurus,
      imageUrl: imageUrl || null,
      tags: serializeTags(formData.getAll("tags").map(String)),
    },
  };
}

export async function addMenuItem(
  _prev: MenuFormState,
  formData: FormData,
): Promise<MenuFormState> {
  const categoryId = String(formData.get("categoryId") ?? "");
  const kategori = await prisma.menuCategory.findUnique({ where: { id: categoryId } });
  if (!kategori) return { error: "Bölüm bulunamadı." };

  const hata = await menuIzni(kategori.businessId);
  if (hata) return { error: hata };

  const alanlar = urunAlanlari(formData);
  if (!alanlar.ok) return { error: alanlar.error };

  const son = await prisma.menuItem.findFirst({
    where: { categoryId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  await prisma.menuItem.create({
    data: {
      businessId: kategori.businessId,
      categoryId,
      sortOrder: (son?.sortOrder ?? 0) + 10,
      ...alanlar.veri,
    },
  });

  yenile();
  return { saved: `${alanlar.veri.name} eklendi.` };
}

export async function updateMenuItem(
  _prev: MenuFormState,
  formData: FormData,
): Promise<MenuFormState> {
  const id = String(formData.get("itemId") ?? "");
  const urun = await prisma.menuItem.findUnique({ where: { id } });
  if (!urun) return { error: "Ürün bulunamadı." };

  const hata = await menuIzni(urun.businessId);
  if (hata) return { error: hata };

  const alanlar = urunAlanlari(formData);
  if (!alanlar.ok) return { error: alanlar.error };

  await prisma.menuItem.update({ where: { id }, data: alanlar.veri });
  yenile();
  return { saved: `${alanlar.veri.name} güncellendi.` };
}

/**
 * "Bugün tükendi" işareti.
 *
 * Menünün en sık değişen alanı bu ve mutfaktan gelen bilgiyle saniyeler
 * içinde işaretlenmesi gerekiyor; bu yüzden tek tıklık ayrı bir işlem.
 * Ürünü silmek yanlış olurdu: yarın geri gelecek ve geçmiş puanları ona bağlı.
 */
export async function toggleSoldOut(formData: FormData) {
  const id = String(formData.get("itemId") ?? "");
  const urun = await prisma.menuItem.findUnique({ where: { id } });
  if (!urun) return;
  if (await menuIzni(urun.businessId)) return;

  await prisma.menuItem.update({ where: { id }, data: { soldOut: !urun.soldOut } });
  yenile();
}

export async function toggleMenuItem(formData: FormData) {
  const id = String(formData.get("itemId") ?? "");
  const urun = await prisma.menuItem.findUnique({ where: { id } });
  if (!urun) return;
  if (await menuIzni(urun.businessId)) return;

  await prisma.menuItem.update({ where: { id }, data: { active: !urun.active } });
  yenile();
}

export async function moveMenuItem(formData: FormData) {
  const id = String(formData.get("itemId") ?? "");
  const yon = String(formData.get("direction") ?? "");
  const urun = await prisma.menuItem.findUnique({ where: { id } });
  if (!urun) return;
  if (await menuIzni(urun.businessId)) return;

  const komsu = await prisma.menuItem.findFirst({
    where: {
      categoryId: urun.categoryId,
      sortOrder: yon === "up" ? { lt: urun.sortOrder } : { gt: urun.sortOrder },
    },
    orderBy: { sortOrder: yon === "up" ? "desc" : "asc" },
  });
  if (!komsu) return;

  await prisma.$transaction([
    prisma.menuItem.update({ where: { id: urun.id }, data: { sortOrder: komsu.sortOrder } }),
    prisma.menuItem.update({ where: { id: komsu.id }, data: { sortOrder: urun.sortOrder } }),
  ]);
  yenile();
}
