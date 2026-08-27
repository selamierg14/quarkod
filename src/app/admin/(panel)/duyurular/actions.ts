"use server";

import { revalidatePath } from "next/cache";
import { canAccessBusiness, requireMenuErisim, requireYazma, visibleBusinesses } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { validateImageDataUrl } from "@/lib/image";
import { denetimYaz } from "@/lib/denetim";

export type DuyuruFormState = { error?: string; saved?: string };

function tarihParse(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function duyuruEkle(
  _prev: DuyuruFormState,
  formData: FormData,
): Promise<DuyuruFormState> {
  const actor = await requireMenuErisim();
  await requireYazma();

  const businessId = String(formData.get("businessId") ?? "");
  const baslik = String(formData.get("baslik") ?? "").trim();
  const aciklama = String(formData.get("aciklama") ?? "").trim();
  const imageUrl = String(formData.get("imageUrl") ?? "");
  const baslangic = tarihParse(String(formData.get("baslangic") ?? ""));
  const bitis = tarihParse(String(formData.get("bitis") ?? ""));
  const tumIsletmeler = String(formData.get("tumIsletmeler") ?? "") === "on";

  if (!(await canAccessBusiness(actor, businessId))) {
    return { error: "Bu işletmeye yetkiniz yok." };
  }
  if (!baslik) return { error: "Başlık gerekli." };
  if (baslangic && bitis && baslangic > bitis) {
    return { error: "Başlangıç, bitişten sonra olamaz." };
  }
  if (imageUrl) {
    const problem = validateImageDataUrl(imageUrl, "duyuru");
    if (problem) return { error: problem };
  }

  // "Tüm işletmelerde göster" işaretliyse aynı duyuru, kullanıcının
  // erişebildiği her şubede ayrı bir kayıt olarak açılır — tek bir kayıt
  // paylaşılmıyor ki bir şube ileride kendi duyurusunu bağımsız
  // düzenleyip/silebilsin, diğerlerini etkilemesin.
  const hedefIsletmeler = tumIsletmeler
    ? await visibleBusinesses(actor)
    : [{ id: businessId }];

  const sonSiralar = await Promise.all(
    hedefIsletmeler.map((isletme) =>
      prisma.duyuru.findFirst({
        where: { businessId: isletme.id },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      }),
    ),
  );

  await prisma.$transaction(
    hedefIsletmeler.map((isletme, i) =>
      prisma.duyuru.create({
        data: {
          businessId: isletme.id,
          baslik,
          aciklama: aciklama || null,
          imageUrl: imageUrl || null,
          baslangic,
          bitis,
          sortOrder: (sonSiralar[i]?.sortOrder ?? -1) + 1,
        },
      }),
    ),
  );

  await denetimYaz(actor, "business.duyuru", {
    entity: "duyuru",
    detail:
      hedefIsletmeler.length > 1
        ? `"${baslik}" eklendi (${hedefIsletmeler.length} işletmede)`
        : `"${baslik}" eklendi`,
  });

  revalidatePath("/admin/duyurular");
  return {
    saved:
      hedefIsletmeler.length > 1
        ? `Duyuru ${hedefIsletmeler.length} işletmede yayınlandı.`
        : "Duyuru eklendi.",
  };
}

export async function duyuruDuzenle(
  _prev: DuyuruFormState,
  formData: FormData,
): Promise<DuyuruFormState> {
  const actor = await requireMenuErisim();
  await requireYazma();

  const id = String(formData.get("id") ?? "");
  const duyuru = await prisma.duyuru.findUnique({ where: { id } });
  if (!duyuru) return { error: "Duyuru bulunamadı." };
  if (!(await canAccessBusiness(actor, duyuru.businessId))) {
    return { error: "Bu işletmeye yetkiniz yok." };
  }

  const baslik = String(formData.get("baslik") ?? "").trim();
  const aciklama = String(formData.get("aciklama") ?? "").trim();
  const imageUrl = String(formData.get("imageUrl") ?? "");
  const baslangic = tarihParse(String(formData.get("baslangic") ?? ""));
  const bitis = tarihParse(String(formData.get("bitis") ?? ""));

  if (!baslik) return { error: "Başlık gerekli." };
  if (baslangic && bitis && baslangic > bitis) {
    return { error: "Başlangıç, bitişten sonra olamaz." };
  }
  if (imageUrl && imageUrl !== duyuru.imageUrl) {
    const problem = validateImageDataUrl(imageUrl, "duyuru");
    if (problem) return { error: problem };
  }

  await prisma.duyuru.update({
    where: { id },
    data: {
      baslik,
      aciklama: aciklama || null,
      imageUrl: imageUrl || null,
      baslangic,
      bitis,
    },
  });

  await denetimYaz(actor, "business.duyuru", {
    entity: "duyuru",
    entityId: id,
    detail: `"${baslik}" düzenlendi`,
  });

  // QR karşılama ve duyurular sayfaları force-dynamic; her istekte
  // veritabanından okuyor, ayrıca yenilemeye gerek yok.
  revalidatePath("/admin/duyurular");
  return { saved: "Duyuru güncellendi." };
}

export async function duyuruAktifDegistir(formData: FormData): Promise<void> {
  const actor = await requireMenuErisim();
  await requireYazma();

  const id = String(formData.get("id") ?? "");
  const duyuru = await prisma.duyuru.findUnique({ where: { id } });
  if (!duyuru) return;
  if (!(await canAccessBusiness(actor, duyuru.businessId))) return;

  await prisma.duyuru.update({ where: { id }, data: { aktif: !duyuru.aktif } });
  revalidatePath("/admin/duyurular");
}

export async function duyuruSil(formData: FormData): Promise<void> {
  const actor = await requireMenuErisim();
  await requireYazma();

  const id = String(formData.get("id") ?? "");
  const duyuru = await prisma.duyuru.findUnique({ where: { id } });
  if (!duyuru) return;
  if (!(await canAccessBusiness(actor, duyuru.businessId))) return;

  await prisma.duyuru.delete({ where: { id } });
  revalidatePath("/admin/duyurular");
}
