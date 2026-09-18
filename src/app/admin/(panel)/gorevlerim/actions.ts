"use server";

import { revalidatePath } from "next/cache";
import { canAccessBusiness, requireUser, requireYazma } from "@/lib/kimlik/auth";
import { prisma } from "@/lib/cekirdek/db";
import { gunBaslangici } from "@/lib/cekirdek/gun";
import { gecerliVardiyaMi } from "@/lib/personel/vardiya";
import { alanDogrula } from "@/lib/cekirdek/desenler";

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
  // Not sınırsızdı: tek istekle megabaytlarca metin ShiftNote tablosuna
  // yazılabiliyordu.
  const notSonuc = alanDogrula(formData.get("text"), "not", "Not", { zorunlu: true });

  if (!(await canAccessBusiness(user, businessId))) {
    return { error: "Bu işletmeye erişiminiz yok." };
  }
  if (!notSonuc.ok) return { error: notSonuc.hata };
  if (!gecerliVardiyaMi(shift)) {
    return { error: "Vardiya seçin." };
  }
  const text = notSonuc.deger;

  await prisma.shiftNote.create({
    data: { businessId, date: gunBaslangici(), shift, authorId: user.id, text },
  });

  revalidatePath("/admin/gorevlerim");
  return { saved: "Not eklendi." };
}
