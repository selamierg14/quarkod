"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type DegisimFormState = { error?: string; saved?: string };

/**
 * "Bu vardiyayı bırakmak istiyorum" talebi. Otomatik yer değiştirme yok —
 * onaylanırsa atama boşalır, yöneticinin çizelgeden birini ataması gerekir.
 * Karar yetkisi tamamen yönetimde; personel yalnızca kendi atamasına talep
 * açabilir.
 */
export async function degisimTalepEt(
  _prev: DegisimFormState,
  formData: FormData,
): Promise<DegisimFormState> {
  const user = await requireUser();
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  const atama = await prisma.shiftAssignment.findFirst({
    where: { id: assignmentId, userId: user.id },
  });
  if (!atama) return { error: "Bu vardiya size ait değil." };

  const mevcut = await prisma.shiftSwapRequest.findFirst({
    where: { assignmentId, status: "bekliyor" },
  });
  if (mevcut) return { error: "Bu vardiya için zaten bekleyen bir talep var." };

  await prisma.shiftSwapRequest.create({
    data: { assignmentId, requestedById: user.id, note: note || null },
  });

  revalidatePath("/admin/vardiyalarim");
  revalidatePath("/admin/vardiya-planlama");
  return { saved: "Talep gönderildi." };
}
