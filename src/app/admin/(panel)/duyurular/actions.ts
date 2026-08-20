"use server";

import { revalidatePath } from "next/cache";
import { canAccessBusiness, requireMenuErisim, requireYazma } from "@/lib/auth";
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

  const sonuncu = await prisma.duyuru.findFirst({
    where: { businessId },
    orderBy: { sortOrder: "desc" },
  });

  await prisma.duyuru.create({
    data: {
      businessId,
      baslik,
      aciklama: aciklama || null,
      imageUrl: imageUrl || null,
      baslangic,
      bitis,
      sortOrder: (sonuncu?.sortOrder ?? -1) + 1,
    },
  });

  await denetimYaz(actor, "business.duyuru", {
    entity: "duyuru",
    detail: `"${baslik}" eklendi`,
  });

  revalidatePath("/admin/duyurular");
  return { saved: "Duyuru eklendi." };
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
