"use server";

import { revalidatePath } from "next/cache";
import { requireSuperadmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { denetimYaz } from "@/lib/denetim";

const YOL = "/admin/plus";

export type PlusFormState = { error?: string; saved?: string };

/**
 * Bir Biyerlere kullanıcısını Plus üyesi yapar (ya da süresini günceller).
 *
 * Ödeme entegrasyonu yok (bkz. AppUser.plusUyeMi şema yorumu) — bu, panelin
 * B2B tarafındaki "elle ödeme kaydı" ile aynı ilke: gerçek tahsilat
 * entegre olana kadar üyelik durumunu superadmin elle yönetiyor.
 */
export async function plusYap(
  _prev: PlusFormState,
  formData: FormData,
): Promise<PlusFormState> {
  const actor = await requireSuperadmin();
  const appUserId = String(formData.get("appUserId") ?? "");
  const gunSayisi = Number(formData.get("gunSayisi") ?? "30");

  const kullanici = await prisma.appUser.findUnique({ where: { id: appUserId }, select: { username: true } });
  if (!kullanici) return { error: "Kullanıcı bulunamadı." };
  if (!Number.isFinite(gunSayisi) || gunSayisi <= 0) return { error: "Gün sayısı geçersiz." };

  const bitis = new Date(Date.now() + Math.floor(gunSayisi) * 24 * 60 * 60 * 1000);

  await prisma.appUser.update({
    where: { id: appUserId },
    data: { plusUyeMi: true, plusBitis: bitis },
  });

  await denetimYaz(actor, "platform.biyerlerePlus", {
    detail: `${kullanici.username}: Plus üyeliği ${Math.floor(gunSayisi)} gün için açıldı (bitiş: ${bitis.toLocaleDateString("tr-TR")})`,
    entity: "AppUser",
    entityId: appUserId,
    accountId: null,
  });
  revalidatePath(YOL);
  return { saved: "Plus üyeliği tanımlandı." };
}

export async function plusKaldir(formData: FormData): Promise<void> {
  const actor = await requireSuperadmin();
  const appUserId = String(formData.get("appUserId") ?? "");
  const kullanici = await prisma.appUser.findUnique({ where: { id: appUserId }, select: { username: true } });
  if (!kullanici) return;

  await prisma.appUser.update({ where: { id: appUserId }, data: { plusUyeMi: false } });
  await denetimYaz(actor, "platform.biyerlerePlus", {
    detail: `${kullanici.username}: Plus üyeliği kaldırıldı`,
    entity: "AppUser",
    entityId: appUserId,
    accountId: null,
  });
  revalidatePath(YOL);
}
