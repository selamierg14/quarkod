"use server";

import { revalidatePath } from "next/cache";
import { canAccessBusiness, requirePersonelYonetimi, requireYazma } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { gunBaslangici } from "@/lib/gun";

export async function vardiyaAta(formData: FormData): Promise<void> {
  const actor = await requirePersonelYonetimi();
  await requireYazma();

  const businessId = String(formData.get("businessId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const tarihStr = String(formData.get("date") ?? "");
  const shift = String(formData.get("shift") ?? "");

  if (!userId || !tarihStr || !["sabah", "aksam", "gece"].includes(shift)) return;
  if (!(await canAccessBusiness(actor, businessId))) return;

  // Atanan kişi gerçekten bu işletmenin personeli mi — form manipüle
  // edilip başka kiracının kullanıcısı bu vardiyaya yazılamasın.
  const personel = await prisma.user.findFirst({
    where: { id: userId, businessId },
  });
  if (!personel) return;

  const date = gunBaslangici(new Date(tarihStr));

  try {
    await prisma.shiftAssignment.create({
      data: { businessId, userId, date, shift },
    });
  } catch {
    // Zaten atanmış (tekillik hatası) — sessizce yut, aynı sonuca varır.
  }

  revalidatePath("/admin/vardiya-planlama");
}

export async function vardiyaKaldir(formData: FormData): Promise<void> {
  const actor = await requirePersonelYonetimi();
  await requireYazma();

  const id = String(formData.get("id") ?? "");
  const atama = await prisma.shiftAssignment.findUnique({ where: { id } });
  if (!atama) return;
  if (!(await canAccessBusiness(actor, atama.businessId))) return;

  await prisma.shiftAssignment.delete({ where: { id } });
  revalidatePath("/admin/vardiya-planlama");
}
