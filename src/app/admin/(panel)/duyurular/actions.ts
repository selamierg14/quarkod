"use server";

import { revalidatePath } from "next/cache";
import { canAccessBusiness, requireMenuErisim, requireYazma, visibleBusinesses } from "@/lib/kimlik/auth";
import { prisma } from "@/lib/cekirdek/db";
import { validateImageDataUrl } from "@/lib/isletme/image";
import { denetimYaz } from "@/lib/rapor/denetim";
import { alanDogrula } from "@/lib/cekirdek/desenler";
import { ilkHata } from "@/lib/cekirdek/girdi";
import { gunBaslangici, gunGirdisi, gunGirdisindenTarih } from "@/lib/cekirdek/gun";
import { duyuruTarihHatasi } from "@/lib/isletme/duyuru";

export type DuyuruFormState = { error?: string; saved?: string };

/**
 * "yyyy-aa-gg" → YEREL gün başı. `new Date("2026-01-05")` UTC gece yarısı
 * veriyordu (İstanbul'da 03:00); duyuru kuralı artık günleri karşılaştırıyor
 * (bkz. lib/isletme/duyuru.ts) ama saklanan değer de gün başı olsun.
 */
function tarihParse(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = gunGirdisindenTarih(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function duyuruEkle(
  _prev: DuyuruFormState,
  formData: FormData,
): Promise<DuyuruFormState> {
  const actor = await requireMenuErisim();
  await requireYazma();

  const businessId = String(formData.get("businessId") ?? "");
  const baslikSonuc = alanDogrula(formData.get("baslik"), "kisaBaslik", "Başlık");
  const aciklamaSonuc = alanDogrula(formData.get("aciklama"), "aciklama", "Açıklama", {
    zorunlu: false,
  });
  const alanHatasi = ilkHata(baslikSonuc, aciklamaSonuc);
  const baslik = baslikSonuc.ok ? baslikSonuc.deger : "";
  const aciklama = aciklamaSonuc.ok ? aciklamaSonuc.deger : "";
  const imageUrl = String(formData.get("imageUrl") ?? "");
  const baslangic = tarihParse(String(formData.get("baslangic") ?? ""));
  const bitis = tarihParse(String(formData.get("bitis") ?? ""));
  const tumIsletmeler = String(formData.get("tumIsletmeler") ?? "") === "on";

  if (!(await canAccessBusiness(actor, businessId))) {
    return { error: "Bu işletmeye yetkiniz yok." };
  }
  if (alanHatasi) return { error: alanHatasi };
  const tarihHatasi = duyuruTarihHatasi(baslangic, bitis);
  if (tarihHatasi) return { error: tarihHatasi };
  if (imageUrl) {
    const problem = validateImageDataUrl(imageUrl, "duyuru");
    if (problem) return { error: problem };
  }

  // "Tüm işletmelerde göster" işaretliyse aynı duyuru, kullanıcının
  // erişebildiği her şubede ayrı bir kayıt olarak açılır — tek bir kayıt
  // paylaşılmıyor ki bir şube ileride kendi duyurusunu bağımsız
  // düzenleyip/silebilsin, diğerlerini etkilemesin.
  const hedefIsletmeler = tumIsletmeler
    ? await visibleBusinesses(actor)
    : [{ id: businessId }];

  const sonSiralar = await Promise.all(
    hedefIsletmeler.map((isletme) =>
      prisma.duyuru.findFirst({
        where: { businessId: isletme.id },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      }),
    ),
  );

  await prisma.$transaction(
    hedefIsletmeler.map((isletme, i) =>
      prisma.duyuru.create({
        data: {
          businessId: isletme.id,
          baslik,
          aciklama: aciklama || null,
          imageUrl: imageUrl || null,
          baslangic,
          bitis,
          sortOrder: (sonSiralar[i]?.sortOrder ?? -1) + 1,
        },
      }),
    ),
  );

  await denetimYaz(actor, "business.duyuru", {
    entity: "duyuru",
    detail:
      hedefIsletmeler.length > 1
        ? `"${baslik}" eklendi (${hedefIsletmeler.length} işletmede)`
        : `"${baslik}" eklendi`,
  });

  revalidatePath("/admin/duyurular");
  return {
    saved:
      hedefIsletmeler.length > 1
        ? `Duyuru ${hedefIsletmeler.length} işletmede yayınlandı.`
        : "Duyuru eklendi.",
  };
}

export async function duyuruDuzenle(
  _prev: DuyuruFormState,
  formData: FormData,
): Promise<DuyuruFormState> {
  const actor = await requireMenuErisim();
  await requireYazma();

  const id = String(formData.get("id") ?? "");
  const duyuru = await prisma.duyuru.findUnique({ where: { id } });
  if (!duyuru) return { error: "Duyuru bulunamadı." };
  if (!(await canAccessBusiness(actor, duyuru.businessId))) {
    return { error: "Bu işletmeye yetkiniz yok." };
  }

  const baslikSonuc = alanDogrula(formData.get("baslik"), "kisaBaslik", "Başlık");
  const aciklamaSonuc = alanDogrula(formData.get("aciklama"), "aciklama", "Açıklama", {
    zorunlu: false,
  });
  const alanHatasi = ilkHata(baslikSonuc, aciklamaSonuc);
  const baslik = baslikSonuc.ok ? baslikSonuc.deger : "";
  const aciklama = aciklamaSonuc.ok ? aciklamaSonuc.deger : "";
  const imageUrl = String(formData.get("imageUrl") ?? "");
  const baslangic = tarihParse(String(formData.get("baslangic") ?? ""));
  const bitis = tarihParse(String(formData.get("bitis") ?? ""));

  if (alanHatasi) return { error: alanHatasi };
  // Düzenlemede geçmiş bitiş YALNIZCA değiştirildiyse hata: süresi dolmuş
  // bir duyurunun yalnızca metnini düzelten kullanıcıyı tarihi
  // değiştirmeye zorlamıyoruz.
  // Gün olarak kıyas: eski kayıtlar UTC gece yarısı (00:00Z), yeni
  // okunan İstanbul gece yarısı (21:00Z) — aynı gün, farklı an.
  const gunAnahtari = (d: Date | null) => (d ? gunGirdisi(gunBaslangici(d)) : null);
  const bitisDegisti = gunAnahtari(bitis) !== gunAnahtari(duyuru.bitis);
  const tarihHatasi = duyuruTarihHatasi(baslangic, bitis, new Date(), bitisDegisti);
  if (tarihHatasi) return { error: tarihHatasi };
  if (imageUrl && imageUrl !== duyuru.imageUrl) {
    const problem = validateImageDataUrl(imageUrl, "duyuru");
    if (problem) return { error: problem };
  }

  await prisma.duyuru.update({
    where: { id },
    data: {
      baslik,
      aciklama: aciklama || null,
      imageUrl: imageUrl || null,
      baslangic,
      bitis,
    },
  });

  await denetimYaz(actor, "business.duyuru", {
    entity: "duyuru",
    entityId: id,
    detail: `"${baslik}" düzenlendi`,
  });

  // QR karşılama ve duyurular sayfaları force-dynamic; her istekte
  // veritabanından okuyor, ayrıca yenilemeye gerek yok.
  revalidatePath("/admin/duyurular");
  return { saved: "Duyuru güncellendi." };
}

export async function duyuruAktifDegistir(formData: FormData): Promise<void> {
  const actor = await requireMenuErisim();
  await requireYazma();

  const id = String(formData.get("id") ?? "");
  const duyuru = await prisma.duyuru.findUnique({ where: { id } });
  if (!duyuru) return;
  if (!(await canAccessBusiness(actor, duyuru.businessId))) return;

  await prisma.duyuru.update({ where: { id }, data: { aktif: !duyuru.aktif } });
  revalidatePath("/admin/duyurular");
}

export async function duyuruSil(formData: FormData): Promise<void> {
  const actor = await requireMenuErisim();
  await requireYazma();

  const id = String(formData.get("id") ?? "");
  const duyuru = await prisma.duyuru.findUnique({ where: { id } });
  if (!duyuru) return;
  if (!(await canAccessBusiness(actor, duyuru.businessId))) return;

  await prisma.duyuru.delete({ where: { id } });
  revalidatePath("/admin/duyurular");
}
