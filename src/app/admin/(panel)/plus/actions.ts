"use server";

import { revalidatePath } from "next/cache";
import { requireSuperadmin } from "@/lib/kimlik/auth";
import { prisma } from "@/lib/cekirdek/db";
import { denetimYaz } from "@/lib/rapor/denetim";
import { sayiAlani } from "@/lib/cekirdek/girdi";

const YOL = "/admin/plus";

/** En uzun Plus tanımlaması — on yıl. Daha uzunu bir yazım hatasıdır. */
const EN_COK_PLUS_GUN = 3650;

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
  // ÜST SINIR yoktu ve sonucu sessiz bir 500'dü: büyük bir gün sayısı
  // `new Date(...)` çağrısını Invalid Date'e düşürüyor, Prisma da onu
  // yazmayı reddedip fırlatıyordu. Sınır veritabanına GİTMEDEN önce.
  const gunSonuc = sayiAlani(formData.get("gunSayisi"), "Gün sayısı", {
    enAz: 1,
    enCok: EN_COK_PLUS_GUN,
    varsayilan: 30,
  });
  if (!gunSonuc.ok) return { error: gunSonuc.hata };
  const gunSayisi = gunSonuc.deger;

  const kullanici = await prisma.appUser.findUnique({ where: { id: appUserId }, select: { username: true } });
  if (!kullanici) return { error: "Kullanıcı bulunamadı." };

  const bitis = new Date(Date.now() + gunSayisi * 24 * 60 * 60 * 1000);

  await prisma.appUser.update({
    where: { id: appUserId },
    data: { plusUyeMi: true, plusBitis: bitis },
  });

  await denetimYaz(actor, "platform.biyerlerePlus", {
    detail: `${kullanici.username}: Plus üyeliği ${gunSayisi} gün için açıldı (bitiş: ${bitis.toLocaleDateString("tr-TR")})`,
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
