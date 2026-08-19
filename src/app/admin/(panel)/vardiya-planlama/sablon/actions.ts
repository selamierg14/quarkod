"use server";

import { revalidatePath } from "next/cache";
import { canAccessBusiness, requirePersonelYonetimi, requireYazma } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type SablonFormState = { error?: string; saved?: string };

export async function gorevEkle(
  _prev: SablonFormState,
  formData: FormData,
): Promise<SablonFormState> {
  const actor = await requirePersonelYonetimi();
  await requireYazma();

  const businessId = String(formData.get("businessId") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const gorev = String(formData.get("gorev") ?? "");

  if (!(await canAccessBusiness(actor, businessId))) {
    return { error: "Bu işletmeye yetkiniz yok." };
  }
  if (!label) return { error: "Görev adı gerekli." };
  if (!["acilis", "kapanis"].includes(gorev)) return { error: "Açılış ya da kapanış seçin." };

  const sonuncu = await prisma.checklistItem.findFirst({
    where: { businessId, gorev },
    orderBy: { sortOrder: "desc" },
  });

  await prisma.checklistItem.create({
    data: { businessId, label, gorev, sortOrder: (sonuncu?.sortOrder ?? -1) + 1 },
  });

  revalidatePath("/admin/vardiya-planlama/sablon");
  revalidatePath("/admin/gorevlerim");
  return { saved: "Görev eklendi." };
}

export async function gorevSil(formData: FormData): Promise<void> {
  const actor = await requirePersonelYonetimi();
  await requireYazma();

  const id = String(formData.get("id") ?? "");
  const item = await prisma.checklistItem.findUnique({ where: { id } });
  if (!item) return;
  if (!(await canAccessBusiness(actor, item.businessId))) return;

  // Geçmiş tamamlama kayıtları anlamlı kalsın diye silmiyoruz, pasife
  // alıyoruz — geçmiş günlerin raporu "o gün bu görev vardı" demeye
  // devam etsin.
  await prisma.checklistItem.update({ where: { id }, data: { active: false } });

  revalidatePath("/admin/vardiya-planlama/sablon");
  revalidatePath("/admin/gorevlerim");
}
