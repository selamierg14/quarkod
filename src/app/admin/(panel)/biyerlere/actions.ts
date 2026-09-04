"use server";

import { revalidatePath } from "next/cache";
import { canAccessBusiness, requireMenuErisim, requireYazma } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { denetimYaz } from "@/lib/denetim";
import {
  expoyaGonder,
  pushHedefleriniSuz,
  pushMesajiOlustur,
  type PushHedefi,
} from "@/lib/app-push";
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
 * İki iş birden yapıyor: süreli bir duyuru açıyor VE işletmenin
 * çevresindeki (bkz. lib/push.ts, 3 km) bildirim abonelerine anlık
 * bildirim gönderiyor. Uzun süre yalnızca ilkini yapıp kredi düşüyordu;
 * artık kredinin karşılığı gerçekten veriliyor.
 *
 * Bildirim gönderimi duyuruyu BLOKLAMIYOR: Expo'ya ulaşılamazsa duyuru
 * yine de yayında kalır (yoksa işletme hem kredisini hem kampanyasını
 * kaybederdi). Kaç kişiye gittiği sahibe dönen mesajda yazıyor — sıfırsa
 * sıfır olduğu söyleniyor, "gönderildi" izlenimi verilmiyor.
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
    select: { pushKredisi: true, name: true, slug: true, latitude: true, longitude: true },
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

  const gonderilen = await yakindakilereBildir(business, baslik);

  await denetimYaz(actor, "business.flasIndirim", {
    entity: "business",
    entityId: businessId,
    detail: `Flaş indirim başlatıldı: ${baslik} (${sureSaat} sa, ${gonderilen} bildirim, kalan kredi: ${business.pushKredisi - 1})`,
  });

  revalidatePath("/admin/duyurular");
  revalidatePath(YOL);
  return {
    saved:
      gonderilen > 0
        ? `Yayında! ${gonderilen} kişiye bildirim gitti, ${sureSaat} saat sonra otomatik biter.`
        : `Yayında! ${sureSaat} saat sonra otomatik biter. (Şu an çevrede bildirime açık kullanıcı yoktu.)`,
  };
}

/**
 * İşletmenin çevresindeki bildirim abonelerine anlık bildirim gönderir.
 *
 * Hedef listesi iki koşulla daraltılıyor: aboneliği kapatılmamış bir
 * cihaz jetonu VE yeterince taze bir konum (bkz. lib/push.ts). Süzme
 * mantığı orada saf fonksiyonda ve testli — buradaki iş yalnızca veriyi
 * toplayıp sonucu yazmak.
 */
async function yakindakilereBildir(
  business: { name: string; slug: string; latitude: number | null; longitude: number | null },
  baslik: string,
): Promise<number> {
  const abonelikler = await prisma.appPushSubscription.findMany({
    where: { disabledAt: null, expoToken: { not: null } },
    select: {
      expoToken: true,
      appUser: {
        select: {
          id: true,
          active: true,
          sonBilinenEnlem: true,
          sonBilinenBoylam: true,
          sonKonumGuncelleme: true,
        },
      },
    },
  });

  const hedefler: PushHedefi[] = abonelikler
    .filter((a) => a.appUser.active)
    .map((a) => ({
      appUserId: a.appUser.id,
      jeton: a.expoToken!,
      konum:
        a.appUser.sonBilinenEnlem !== null && a.appUser.sonBilinenBoylam !== null
          ? { enlem: a.appUser.sonBilinenEnlem, boylam: a.appUser.sonBilinenBoylam }
          : null,
      konumGuncelleme: a.appUser.sonKonumGuncelleme,
    }));

  const mekanKonumu =
    business.latitude !== null && business.longitude !== null
      ? { enlem: business.latitude, boylam: business.longitude }
      : null;

  const secilenler = pushHedefleriniSuz(hedefler, mekanKonumu);
  if (secilenler.length === 0) return 0;

  const { gonderilen, gecersizJetonlar } = await expoyaGonder(
    secilenler.map((h) =>
      pushMesajiOlustur(h.jeton, `⚡ ${business.name}`, baslik, { slug: business.slug }),
    ),
  );

  // Expo "bu cihaz artık kayıtlı değil" dediyse jeton çürümüştür; bir
  // daha denenmemesi için kapatılıyor (silinmiyor — kullanıcı yeniden
  // izin verirse aynı kayıt canlanıyor).
  if (gecersizJetonlar.length > 0) {
    await prisma.appPushSubscription.updateMany({
      where: { expoToken: { in: gecersizJetonlar } },
      data: { disabledAt: new Date(), disabledReason: "cihaz-kayitli-degil" },
    });
  }

  return gonderilen;
}
