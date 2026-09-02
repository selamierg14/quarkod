"use server";

import { revalidatePath } from "next/cache";
import { requireSuperadmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { denetimYaz } from "@/lib/denetim";
import { slugIleOlustur } from "@/lib/slug";

export type RotaFormState = { error?: string; saved?: string };

const YOL = "/admin/rotalar";

/**
 * Yeni bir Biyerlere rotası ("kahve pasaportu") açar.
 *
 * Rotalar tek bir hesaba değil PLATFORMA ait — superadmin'in eklediği
 * durak listesi farklı hesaplardaki işletmeleri bir araya getirebiliyor
 * (bkz. schema.prisma'daki Rota modeli yorumu). Bu yüzden panelin normal
 * "kendi işletmene yaz" yetkilendirmesi değil, doğrudan requireSuperadmin
 * kullanılıyor.
 */
export async function rotaEkle(
  _prev: RotaFormState,
  formData: FormData,
): Promise<RotaFormState> {
  const actor = await requireSuperadmin();

  const ad = String(formData.get("ad") ?? "").trim();
  const aciklama = String(formData.get("aciklama") ?? "").trim();
  if (!ad) return { error: "Rota adı gerekli." };

  const rota = await slugIleOlustur(ad, (slug) =>
    prisma.rota.create({
      data: { ad, slug, aciklama: aciklama || null },
    }),
  );

  await denetimYaz(actor, "platform.rota", {
    detail: `Rota açıldı: ${ad}`,
    entity: "Rota",
    entityId: rota.id,
    accountId: null,
  });

  revalidatePath(YOL);
  return { saved: "Rota oluşturuldu." };
}

export async function rotaAktifDegistir(formData: FormData): Promise<void> {
  const actor = await requireSuperadmin();
  const id = String(formData.get("id") ?? "");
  const rota = await prisma.rota.findUnique({ where: { id } });
  if (!rota) return;

  await prisma.rota.update({ where: { id }, data: { aktif: !rota.aktif } });
  await denetimYaz(actor, "platform.rota", {
    detail: `${rota.ad}: ${rota.aktif ? "pasife alındı" : "yayına alındı"}`,
    entity: "Rota",
    entityId: id,
    accountId: null,
  });
  revalidatePath(YOL);
}

export async function rotaSil(formData: FormData): Promise<void> {
  const actor = await requireSuperadmin();
  const id = String(formData.get("id") ?? "");
  const rota = await prisma.rota.findUnique({ where: { id } });
  if (!rota) return;

  // Duraklar ve tamamlama kayıtları cascade ile birlikte gider (bkz.
  // schema.prisma) — bir rota kaldırılınca kullanıcıların "tamamladım"
  // geçmişi de anlamsızlaşır, ayrı ayrı temizlemeye gerek yok.
  await prisma.rota.delete({ where: { id } });
  await denetimYaz(actor, "platform.rota", {
    detail: `Rota silindi: ${rota.ad}`,
    entity: "Rota",
    entityId: id,
    accountId: null,
  });
  revalidatePath(YOL);
}

export async function durakEkle(
  _prev: RotaFormState,
  formData: FormData,
): Promise<RotaFormState> {
  const actor = await requireSuperadmin();
  const rotaId = String(formData.get("rotaId") ?? "");
  const businessId = String(formData.get("businessId") ?? "");
  if (!businessId) return { error: "Bir mekan seç." };

  const [rota, business] = await Promise.all([
    prisma.rota.findUnique({ where: { id: rotaId } }),
    prisma.business.findUnique({ where: { id: businessId }, select: { id: true, name: true } }),
  ]);
  if (!rota) return { error: "Rota bulunamadı." };
  if (!business) return { error: "Mekan bulunamadı." };

  const mevcut = await prisma.rotaDurak.findUnique({
    where: { rotaId_businessId: { rotaId, businessId } },
  });
  if (mevcut) return { error: "Bu mekan zaten bu rotada." };

  const sonSira = await prisma.rotaDurak.findFirst({
    where: { rotaId },
    orderBy: { sira: "desc" },
    select: { sira: true },
  });

  await prisma.rotaDurak.create({
    data: { rotaId, businessId, sira: (sonSira?.sira ?? -1) + 1 },
  });
  await denetimYaz(actor, "platform.rota", {
    detail: `${rota.ad} rotasına durak eklendi: ${business.name}`,
    entity: "Rota",
    entityId: rotaId,
    accountId: null,
  });
  revalidatePath(YOL);
  return { saved: "Durak eklendi." };
}

export async function durakSil(formData: FormData): Promise<void> {
  const actor = await requireSuperadmin();
  const id = String(formData.get("id") ?? "");
  const durak = await prisma.rotaDurak.findUnique({
    where: { id },
    include: { rota: true, business: { select: { name: true } } },
  });
  if (!durak) return;

  await prisma.rotaDurak.delete({ where: { id } });
  await denetimYaz(actor, "platform.rota", {
    detail: `${durak.rota.ad} rotasından durak çıkarıldı: ${durak.business.name}`,
    entity: "Rota",
    entityId: durak.rotaId,
    accountId: null,
  });
  revalidatePath(YOL);
}
