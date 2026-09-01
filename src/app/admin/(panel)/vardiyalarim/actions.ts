"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { bildirimGonder } from "@/lib/bildirim";
import { gunAdi, gunBaslangici } from "@/lib/gun";
import { SHIFTS, type Shift } from "@/lib/constants";
import { gecerliVardiyaMi } from "@/lib/vardiya";

export type DegisimFormState = { error?: string; saved?: string };

function vardiyaEtiketi(tarih: Date, vardiya: string): string {
  return `${gunAdi(tarih)} ${SHIFTS[vardiya as Shift] ?? vardiya}`;
}

/**
 * Vardiya değişim/bırakma talebi.
 *
 * Hedef gün+vardiya BOŞ bırakılırsa "bırakma": onaylanırsa atama kalkar,
 * kimse otomatik gelmez. DOLDURULURSA "değişim": karşı tarafta tam tersini
 * isteyen biri varsa iki talep eşleşip tek onayda karşılıklı takas olur —
 * eşleşme yoksa yönetici hedefin durumuna göre karar verir (bkz.
 * vardiya-planlama/actions.ts, degisimKararVer ve lib/vardiya-degisim.ts).
 */
export async function degisimTalepEt(
  _prev: DegisimFormState,
  formData: FormData,
): Promise<DegisimFormState> {
  const user = await requireUser();
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const hedefTarihStr = String(formData.get("hedefTarih") ?? "").trim();
  const hedefVardiyaStr = String(formData.get("hedefVardiya") ?? "").trim();

  const atama = await prisma.shiftAssignment.findFirst({
    where: { id: assignmentId, userId: user.id },
    include: { business: { select: { accountId: true, name: true } } },
  });
  if (!atama) return { error: "Bu vardiya size ait değil." };

  const mevcut = await prisma.shiftSwapRequest.findFirst({
    where: { assignmentId, status: "bekliyor" },
  });
  if (mevcut) return { error: "Bu vardiya için zaten bekleyen bir talep var." };

  // İkisi de boşsa "bırakma"; ikisi de doluysa "değişim". Yarım bırakılmış
  // bir hedef (sadece gün ya da sadece vardiya seçilmiş) kullanıcı hatası —
  // sessizce biri yok sayılırsa yanlış bir hedefe talep açılmış olurdu.
  let hedefTarih: Date | null = null;
  let hedefVardiya: string | null = null;
  if (hedefTarihStr || hedefVardiyaStr) {
    if (!hedefTarihStr || !gecerliVardiyaMi(hedefVardiyaStr)) {
      return { error: "Hedef gün ve vardiyanın ikisini de seçin." };
    }
    hedefTarih = gunBaslangici(new Date(hedefTarihStr));
    hedefVardiya = hedefVardiyaStr;
    if (hedefTarih.getTime() === atama.date.getTime() && hedefVardiya === atama.shift) {
      return { error: "Hedef, mevcut vardiyanızla aynı olamaz." };
    }
  }

  await prisma.shiftSwapRequest.create({
    data: { assignmentId, requestedById: user.id, note: note || null, hedefTarih, hedefVardiya },
  });

  // Aynı alıcı kuralı: hesabın sahibi + bu işletmenin sorumlusu (bkz.
  // izinler/actions.ts, izinTalepEt) — kararı verecek kişi kimse haber ona.
  const yoneticiler = await prisma.user.findMany({
    where: {
      active: true,
      accountId: atama.business.accountId,
      OR: [{ role: "owner" }, { role: "manager", businessId: atama.businessId }],
    },
    select: { id: true },
  });
  const kaynakEtiket = vardiyaEtiketi(atama.date, atama.shift);
  const govde = hedefTarih
    ? `${user.name} — ${kaynakEtiket} yerine ${vardiyaEtiketi(hedefTarih, hedefVardiya!)} istiyor${note ? `: "${note}"` : ""}`
    : `${user.name} — ${kaynakEtiket}${note ? `: "${note}"` : ""}`;
  await bildirimGonder(
    yoneticiler.map((y) => y.id),
    {
      tur: "vardiya.degisim.talep",
      baslik: hedefTarih ? "Vardiya değişim talebi" : "Vardiya bırakma talebi",
      govde,
      url: "/admin/vardiya-planlama",
    },
  );

  revalidatePath("/admin/vardiyalarim");
  revalidatePath("/admin/vardiya-planlama");
  return { saved: "Talep gönderildi." };
}
