"use server";

import { revalidatePath } from "next/cache";
import { requireSuperadmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { denetimYaz } from "@/lib/denetim";
import { haftaBaslangici, gunGirdisi } from "@/lib/gun";
import { sponsorMu } from "@/lib/sponsorluk";

const YOL = "/admin/sponsorlar";

/**
 * Bir işletmeyi bu haftanın sponsoru yapar.
 *
 * Tek seferde en fazla BİR mekan sponsor olabilir — hero banner tek bir
 * yer, iki sponsor aynı anda göstermek "hangisi asıl sponsor" sorusu
 * doğururdu. Bu yüzden yeni sponsoru yazmadan önce aynı haftanın ESKİ
 * sponsorunu (varsa) temizliyoruz. "Aynı hafta" DB'de tek sorguyla
 * ifade edilemiyor (Prisma'da "aynı ISO hafta" filtresi yok), bu yüzden
 * adayları çekip lib/sponsorluk.ts'teki aynı kuralla JS'te süzüyoruz —
 * ölçek küçük (işletme sayısı), maliyeti yok.
 */
export async function sponsorYap(formData: FormData): Promise<void> {
  const actor = await requireSuperadmin();
  const businessId = String(formData.get("businessId") ?? "");
  const business = await prisma.business.findUnique({ where: { id: businessId }, select: { name: true } });
  if (!business) return;

  const simdi = new Date();
  const buHaftaninPazartesi = haftaBaslangici(simdi);

  const eskiSponsorlar = await prisma.business.findMany({
    where: { sponsorHaftasi: { not: null }, id: { not: businessId } },
    select: { id: true, sponsorHaftasi: true },
  });
  const temizlenecekler = eskiSponsorlar
    .filter((b) => sponsorMu(b.sponsorHaftasi, simdi))
    .map((b) => b.id);

  await prisma.$transaction([
    ...(temizlenecekler.length
      ? [prisma.business.updateMany({ where: { id: { in: temizlenecekler } }, data: { sponsorHaftasi: null } })]
      : []),
    prisma.business.update({ where: { id: businessId }, data: { sponsorHaftasi: buHaftaninPazartesi } }),
  ]);

  await denetimYaz(actor, "platform.sponsor", {
    detail: `${business.name} bu haftanın (${gunGirdisi(buHaftaninPazartesi)}) sponsoru yapıldı`,
    entity: "Business",
    entityId: businessId,
    accountId: null,
  });
  revalidatePath(YOL);
}

export async function sponsorKaldir(formData: FormData): Promise<void> {
  const actor = await requireSuperadmin();
  const businessId = String(formData.get("businessId") ?? "");
  const business = await prisma.business.findUnique({ where: { id: businessId }, select: { name: true } });
  if (!business) return;

  await prisma.business.update({ where: { id: businessId }, data: { sponsorHaftasi: null } });
  await denetimYaz(actor, "platform.sponsor", {
    detail: `${business.name}: sponsorluk kaldırıldı`,
    entity: "Business",
    entityId: businessId,
    accountId: null,
  });
  revalidatePath(YOL);
}

/** Superadmin bir işletmeye push kredisi tanımlar (satın alma karşılığı — manuel, bkz. hesaplar/actions.ts'teki ödeme kaydı ile aynı ilke). */
export async function krediEkle(formData: FormData): Promise<void> {
  const actor = await requireSuperadmin();
  const businessId = String(formData.get("businessId") ?? "");
  const adet = Number(formData.get("adet") ?? "0");
  if (!Number.isFinite(adet) || adet <= 0) return;

  const business = await prisma.business.update({
    where: { id: businessId },
    data: { pushKredisi: { increment: Math.floor(adet) } },
    select: { name: true, pushKredisi: true },
  });

  await denetimYaz(actor, "platform.pushKredisi", {
    detail: `${business.name}: +${Math.floor(adet)} push kredisi (yeni bakiye: ${business.pushKredisi})`,
    entity: "Business",
    entityId: businessId,
    accountId: null,
  });
  revalidatePath(YOL);
}
