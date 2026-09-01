"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { bildirimGonder } from "@/lib/bildirim";
import { gunAdi } from "@/lib/gun";
import { SHIFTS, type Shift } from "@/lib/constants";

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
    include: { business: { select: { accountId: true, name: true } } },
  });
  if (!atama) return { error: "Bu vardiya size ait değil." };

  const mevcut = await prisma.shiftSwapRequest.findFirst({
    where: { assignmentId, status: "bekliyor" },
  });
  if (mevcut) return { error: "Bu vardiya için zaten bekleyen bir talep var." };

  await prisma.shiftSwapRequest.create({
    data: { assignmentId, requestedById: user.id, note: note || null },
  });

  // Aynı alıcı kuralı: hesabın sahibi + bu işletmenin sorumlusu (bkz.
  // izinler/actions.ts, izinTalepEt — kararı verecek kişi kimse haber ona.
  const yoneticiler = await prisma.user.findMany({
    where: {
      active: true,
      accountId: atama.business.accountId,
      OR: [{ role: "owner" }, { role: "manager", businessId: atama.businessId }],
    },
    select: { id: true },
  });
  await bildirimGonder(
    yoneticiler.map((y) => y.id),
    {
      tur: "vardiya.degisim.talep",
      baslik: "Vardiya bırakma talebi",
      govde: `${user.name} — ${gunAdi(atama.date)} ${SHIFTS[atama.shift as Shift] ?? atama.shift}${note ? `: "${note}"` : ""}`,
      url: "/admin/vardiya-planlama",
    },
  );

  revalidatePath("/admin/vardiyalarim");
  revalidatePath("/admin/vardiya-planlama");
  return { saved: "Talep gönderildi." };
}
