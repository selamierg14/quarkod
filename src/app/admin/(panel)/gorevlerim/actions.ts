"use server";

import { revalidatePath } from "next/cache";
import { canAccessBusiness, requireUser, requireYazma } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { gunBaslangici } from "@/lib/gun";

export type GorevFormState = { error?: string; saved?: string };

/**
 * Bugünün görev kutucuğunu işaretler/kaldırır.
 *
 * Herkes kendi işletmesinin görevini tamamlayabilir — garson dahil; bu
 * ekranın var oluş amacı zaten bu. Yetki kontrolü rol değil işletme
 * erişimine dayanıyor.
 */
export async function toggleGorev(formData: FormData): Promise<void> {
  const user = await requireUser();
  await requireYazma();
  const itemId = String(formData.get("itemId") ?? "");
  const businessId = String(formData.get("businessId") ?? "");

  if (!(await canAccessBusiness(user, businessId))) return;

  const item = await prisma.checklistItem.findFirst({
    where: { id: itemId, businessId },
  });
  if (!item) return;

  const bugun = gunBaslangici();
  const mevcut = await prisma.checklistCompletion.findFirst({
    where: { itemId, date: bugun },
  });

  if (mevcut) {
    await prisma.checklistCompletion.delete({ where: { id: mevcut.id } });
  } else {
    await prisma.checklistCompletion.create({
      data: { itemId, businessId, date: bugun, completedById: user.id },
    });
  }

  revalidatePath("/admin/gorevlerim");
}

export async function shiftNotuEkle(
  _prev: GorevFormState,
  formData: FormData,
): Promise<GorevFormState> {
  const user = await requireUser();
  await requireYazma();
  const businessId = String(formData.get("businessId") ?? "");
  const shift = String(formData.get("shift") ?? "");
  const text = String(formData.get("text") ?? "").trim();

  if (!(await canAccessBusiness(user, businessId))) {
    return { error: "Bu işletmeye erişiminiz yok." };
  }
  if (!text) return { error: "Not boş olamaz." };
  if (!["sabah", "aksam", "gece"].includes(shift)) {
    return { error: "Vardiya seçin." };
  }

  await prisma.shiftNote.create({
    data: { businessId, date: gunBaslangici(), shift, authorId: user.id, text },
  });

  revalidatePath("/admin/gorevlerim");
  return { saved: "Not eklendi." };
}
