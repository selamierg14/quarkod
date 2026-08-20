"use server";

import { revalidatePath } from "next/cache";
import { canAccessBusiness, requirePersonelYonetimi, requireYazma } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { gunBaslangici } from "@/lib/gun";
import { gecerliVardiyaMi } from "@/lib/vardiya";

export async function vardiyaAta(formData: FormData): Promise<void> {
  const actor = await requirePersonelYonetimi();
  await requireYazma();

  const businessId = String(formData.get("businessId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const tarihStr = String(formData.get("date") ?? "");
  const shift = String(formData.get("shift") ?? "");

  if (!userId || !tarihStr || !gecerliVardiyaMi(shift)) return;
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

/**
 * Değişim talebine karar: onaylanırsa atama tamamen kaldırılır (yöneticinin
 * çizelgeden yeniden atamasını bekler), reddedilirse personel aynı
 * vardiyada kalır.
 */
export async function degisimKararVer(formData: FormData): Promise<void> {
  const actor = await requirePersonelYonetimi();
  await requireYazma();

  const id = String(formData.get("id") ?? "");
  const karar = String(formData.get("karar") ?? "");
  if (!["onayla", "reddet"].includes(karar)) return;

  const talep = await prisma.shiftSwapRequest.findUnique({
    where: { id },
    include: { assignment: true },
  });
  if (!talep || talep.status !== "bekliyor") return;
  if (!(await canAccessBusiness(actor, talep.assignment.businessId))) return;

  await prisma.$transaction([
    prisma.shiftSwapRequest.update({
      where: { id },
      data: {
        status: karar === "onayla" ? "onaylandi" : "reddedildi",
        decidedById: actor.id,
        decidedAt: new Date(),
      },
    }),
    ...(karar === "onayla"
      ? [prisma.shiftAssignment.delete({ where: { id: talep.assignmentId } })]
      : []),
  ]);

  revalidatePath("/admin/vardiya-planlama");
  revalidatePath("/admin/vardiyalarim");
}

export type VardiyaAyarFormState = { error?: string; saved?: string };

const SAAT_DESENI = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Hangi vardiyaların kullanıldığı ve saat kaçta başladığı — her işletme
 * kendine göre ayarlar. Sabit üçlü (sabah/akşam/gece) gece çalışmayan bir
 * kafeye ya da öğle vardiyası olan bir yere uymuyordu.
 */
export async function vardiyaAyarlariniGuncelle(
  _prev: VardiyaAyarFormState,
  formData: FormData,
): Promise<VardiyaAyarFormState> {
  const actor = await requirePersonelYonetimi();
  await requireYazma();

  const businessId = String(formData.get("businessId") ?? "");
  if (!(await canAccessBusiness(actor, businessId))) {
    return { error: "Bu işletmeye yetkiniz yok." };
  }

  const alanlar = ["Sabah", "Ogle", "Aksam", "Gece"] as const;
  const veri: Record<string, boolean | string> = {};
  let aktifSayisi = 0;

  for (const alan of alanlar) {
    const aktif = formData.get(`aktif${alan}`) === "on";
    const saat = String(formData.get(`saat${alan}`) ?? "");
    if (aktif) {
      if (!SAAT_DESENI.test(saat)) {
        return { error: `${alan} vardiyası için geçerli bir saat girin (ss:dd).` };
      }
      aktifSayisi += 1;
    }
    veri[`vardiya${alan}Aktif`] = aktif;
    veri[`vardiya${alan}Saat`] = saat || "00:00";
  }

  if (aktifSayisi === 0) {
    return { error: "En az bir vardiya açık kalmalı." };
  }

  await prisma.business.update({ where: { id: businessId }, data: veri });

  revalidatePath("/admin/vardiya-planlama");
  return { saved: "Vardiya ayarları kaydedildi." };
}
