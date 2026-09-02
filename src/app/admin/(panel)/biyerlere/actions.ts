"use server";

import { revalidatePath } from "next/cache";
import { canAccessBusiness, requireMenuErisim, requireYazma } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { denetimYaz } from "@/lib/denetim";
import {
  gecerliSegmentMi,
  googleLinkindenKoordinat,
  koordinatCoz,
  ozellikleriYaz,
  type Koordinat,
} from "@/lib/mekan";

export type BiyerlereFormState = { error?: string; saved?: boolean };
export type FlasIndirimFormState = { error?: string; saved?: string };

const YOL = "/admin/biyerlere";

/**
 * Biyerlere'nin (B2C keşfet uygulaması) işletmeye özel ayarları — İşletme
 * Ayarları'ndan bilerek ayrıldı (bkz. bu klasörün üstündeki genel yorum,
 * lib/panel.ts'teki nav girişi). `updateBusiness` (isletmeler/actions.ts)
 * artık bu alanlara HİÇ dokunmuyor; tek yazan yer burası.
 */
export async function updateBiyerlereSettings(
  _prev: BiyerlereFormState,
  formData: FormData,
): Promise<BiyerlereFormState> {
  const user = await requireYazma();
  const id = String(formData.get("id") ?? "");
  if (!(await canAccessBusiness(user, id))) return { error: "Yetkiniz yok." };

  const business = await prisma.business.findUnique({
    where: { id },
    select: { name: true, googleReviewUrl: true },
  });
  if (!business) return { error: "İşletme bulunamadı." };

  const cozulen = koordinatCoz(
    String(formData.get("latitude") ?? ""),
    String(formData.get("longitude") ?? ""),
  );
  if (cozulen === undefined) {
    return {
      error:
        "Konum okunamadı. Enlem ve boylamı birlikte girin (ör. 40.8715 ve 29.2329) " +
        "ya da ikisini de boş bırakın.",
    };
  }
  // Elle girilmediyse İşletme Ayarları'ndaki Google yorum linkinden
  // çıkarmayı dene — aynı otomatik-çıkarım daha önce tek formdayken de
  // buradaydı, iki forma bölünmek bu kolaylığı kaybettirmemeli.
  const koordinat: Koordinat | null =
    cozulen ?? googleLinkindenKoordinat(business.googleReviewUrl);

  const priceSegment = String(formData.get("priceSegment") ?? "").trim();
  if (priceSegment && !gecerliSegmentMi(priceSegment)) {
    return { error: "Bütçe segmenti geçersiz." };
  }

  // Biyerlere'deki "Ara" ve "WhatsApp'ta yaz" düğmelerinin ikisi de bu
  // numarayı kullanıyor (bkz. lib/kesfet-veri.ts) — biçim E.164.
  const phone = String(formData.get("phone") ?? "").trim();
  if (phone && !/^\+\d{10,15}$/.test(phone)) {
    return { error: "Telefon +90 ile başlayıp yalnızca rakam içermeli (ör. +905551234567)." };
  }

  await prisma.business.update({
    where: { id },
    data: {
      latitude: koordinat?.enlem ?? null,
      longitude: koordinat?.boylam ?? null,
      priceSegment: priceSegment || null,
      mekanOzellikleri: ozellikleriYaz(
        formData.getAll("mekanOzellikleri").map((v) => String(v)),
      ),
      biyerlerePlusOrtagi: formData.get("biyerlerePlusOrtagi") === "on",
      phone: phone || null,
    },
  });

  await denetimYaz(user, "business.update", {
    entity: "business",
    entityId: id,
    detail: `${business.name}: Biyerlere ayarları güncellendi`,
  });

  revalidatePath(YOL);
  return { saved: true };
}

/**
 * Kısa süreli "flaş indirim" duyurusu — bir push kredisi harcıyor.
 *
 * ÖNEMLİ SINIR: superadmin panelinden tanımlanan push kredisi (bkz.
 * admin/sponsorlar) şu an yalnızca burada HARCANIYOR — yakındaki abone
 * kullanıcılara gerçek bir anlık bildirim GÖNDERİLMİYOR. Bunun için
 * tüketici tarafında bir push-abonelik akışı (AppPushSubscription, servis
 * çalışanı, gönderim ardışık düzeni) gerekiyor ve henüz kurulmadı. Kredi
 * harcamak dürüst olsun diye burada açıkça söyleniyor — sahibine "push
 * gönderildi" izlenimi vermeden, gerçekte ne olduğunu (kısa süreli, öne
 * çıkan bir duyuru) anlatıyoruz.
 */
export async function flasIndirimBaslat(
  _prev: FlasIndirimFormState,
  formData: FormData,
): Promise<FlasIndirimFormState> {
  const actor = await requireMenuErisim();
  await requireYazma();

  const businessId = String(formData.get("businessId") ?? "");
  const baslik = String(formData.get("baslik") ?? "").trim();
  const sureSaat = Number(formData.get("sureSaat") ?? "2");

  if (!(await canAccessBusiness(actor, businessId))) return { error: "Bu işletmeye yetkiniz yok." };
  if (!baslik) return { error: "Başlık gerekli." };
  if (!Number.isFinite(sureSaat) || sureSaat <= 0 || sureSaat > 24) {
    return { error: "Süre 1-24 saat arasında olmalı." };
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { pushKredisi: true, name: true },
  });
  if (!business) return { error: "İşletme bulunamadı." };
  if (business.pushKredisi <= 0) {
    return { error: "Push kredin kalmadı. Kredi tanımlaması için Quarkod ile iletişime geç." };
  }

  const simdi = new Date();
  const bitis = new Date(simdi.getTime() + sureSaat * 60 * 60 * 1000);

  const sonSira = await prisma.duyuru.findFirst({
    where: { businessId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  await prisma.$transaction([
    prisma.business.update({ where: { id: businessId }, data: { pushKredisi: { decrement: 1 } } }),
    prisma.duyuru.create({
      data: {
        businessId,
        baslik: `⚡ ${baslik}`,
        baslangic: simdi,
        bitis,
        sortOrder: (sonSira?.sortOrder ?? -1) + 1,
      },
    }),
  ]);

  await denetimYaz(actor, "business.flasIndirim", {
    entity: "business",
    entityId: businessId,
    detail: `Flaş indirim başlatıldı: ${baslik} (${sureSaat} sa, kalan kredi: ${business.pushKredisi - 1})`,
  });

  revalidatePath("/admin/duyurular");
  revalidatePath(YOL);
  return { saved: `Yayında! ${sureSaat} saat sonra otomatik biter.` };
}
