"use server";

import { revalidatePath } from "next/cache";
import { canAccessBusiness, requireRezervasyonErisim, requireYazma } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { denetimYaz } from "@/lib/denetim";
import {
  cakismaBul,
  gecerliDurumMu,
  gecerliKanalMi,
  kapasiteYeterliMi,
  planKonumuKirp,
  rezervasyonDogrula,
  type MevcutRezervasyon,
} from "@/lib/rezervasyon";

const YOL = "/admin/rezervasyon";

export type RezervasyonFormState = { error?: string; saved?: string };

/** Ortak kapı: modül izni + yazma yetkisi + işletme sahipliği. */
async function yetkiliMi(businessId: string) {
  const actor = await requireRezervasyonErisim();
  await requireYazma();
  if (!businessId || !(await canAccessBusiness(actor, businessId))) return null;
  return actor;
}

function metin(formData: FormData, alan: string): string {
  return String(formData.get(alan) ?? "").trim();
}

// --- Bölgeler --------------------------------------------------------

export async function bolgeEkle(
  _prev: RezervasyonFormState,
  formData: FormData,
): Promise<RezervasyonFormState> {
  const businessId = metin(formData, "businessId");
  const actor = await yetkiliMi(businessId);
  if (!actor) return { error: "Bu işletmeye yetkiniz yok." };

  const ad = metin(formData, "ad");
  if (!ad) return { error: "Bölge adı gerekli." };

  const mevcut = await prisma.zone.findFirst({ where: { businessId, ad } });
  if (mevcut) return { error: "Bu adda bir bölge zaten var." };

  const sonSira = await prisma.zone.findFirst({
    where: { businessId },
    orderBy: { sira: "desc" },
    select: { sira: true },
  });

  await prisma.zone.create({
    data: { businessId, ad, sira: (sonSira?.sira ?? -1) + 1 },
  });

  await denetimYaz(actor, "rezervasyon.bolgeEkle", {
    entity: "business",
    entityId: businessId,
    detail: `Bölge eklendi: ${ad}`,
  });

  revalidatePath(YOL);
  revalidatePath(`${YOL}/plan`);
  return { saved: `"${ad}" bölgesi eklendi.` };
}

export async function bolgeSil(
  _prev: RezervasyonFormState,
  formData: FormData,
): Promise<RezervasyonFormState> {
  const businessId = metin(formData, "businessId");
  const actor = await yetkiliMi(businessId);
  if (!actor) return { error: "Bu işletmeye yetkiniz yok." };

  const zoneId = metin(formData, "zoneId");
  const bolge = await prisma.zone.findFirst({ where: { id: zoneId, businessId } });
  if (!bolge) return { error: "Bölge bulunamadı." };

  // Masalar SİLİNMİYOR, bölgesiz kalıyor (şemada onDelete: SetNull).
  // Bölgeyi silmek masaları da silseydi, yanlış tıklama tüm kat planını
  // ve o masalara bağlı rezervasyonları götürürdü.
  await prisma.zone.delete({ where: { id: zoneId } });

  await denetimYaz(actor, "rezervasyon.bolgeSil", {
    entity: "business",
    entityId: businessId,
    detail: `Bölge silindi: ${bolge.ad}`,
  });

  revalidatePath(YOL);
  revalidatePath(`${YOL}/plan`);
  return { saved: `"${bolge.ad}" silindi; masaları bölgesiz kaldı.` };
}

// --- Masa / kat planı ------------------------------------------------

export async function masaKaydet(
  _prev: RezervasyonFormState,
  formData: FormData,
): Promise<RezervasyonFormState> {
  const businessId = metin(formData, "businessId");
  const actor = await yetkiliMi(businessId);
  if (!actor) return { error: "Bu işletmeye yetkiniz yok." };

  const tableId = metin(formData, "tableId");
  const masa = await prisma.table.findFirst({ where: { id: tableId, businessId } });
  if (!masa) return { error: "Masa bulunamadı." };

  const kapasite = Number(formData.get("kapasite") ?? masa.kapasite);
  if (!Number.isFinite(kapasite) || kapasite < 1 || kapasite > 50) {
    return { error: "Kapasite 1-50 arasında olmalı." };
  }

  const zoneIdHam = metin(formData, "zoneId");
  // Bölge işletmeye ait olmalı: başka bir işletmenin bölge id'si
  // gönderilirse masa oraya taşınmamalı.
  const zoneId = zoneIdHam
    ? (await prisma.zone.findFirst({ where: { id: zoneIdHam, businessId } }))?.id ?? null
    : null;

  const sekilHam = metin(formData, "sekil");
  const sekil = sekilHam === "yuvarlak" ? "yuvarlak" : "kare";

  await prisma.table.update({
    where: { id: tableId },
    data: { kapasite: Math.trunc(kapasite), zoneId, sekil },
  });

  revalidatePath(YOL);
  revalidatePath(`${YOL}/plan`);
  return { saved: `Masa ${masa.tableNumber} güncellendi.` };
}

/**
 * Kroki üzerindeki konumları toplu kaydeder.
 *
 * Sürükle-bırak her hareket için ayrı istek atsaydı, tek bir masayı
 * taşımak onlarca yazma demek olurdu. Ekran konumları yerelde tutuyor,
 * "Kaydet" tek seferde gönderiyor.
 */
export async function planKaydet(
  _prev: RezervasyonFormState,
  formData: FormData,
): Promise<RezervasyonFormState> {
  const businessId = metin(formData, "businessId");
  const actor = await yetkiliMi(businessId);
  if (!actor) return { error: "Bu işletmeye yetkiniz yok." };

  let konumlar: { id: string; x: number; y: number }[];
  try {
    konumlar = JSON.parse(metin(formData, "konumlar"));
    if (!Array.isArray(konumlar)) throw new Error("dizi değil");
  } catch {
    return { error: "Plan verisi okunamadı." };
  }

  const masalar = await prisma.table.findMany({
    where: { businessId },
    select: { id: true },
  });
  const gecerliIdler = new Set(masalar.map((m) => m.id));

  const guncellemeler = konumlar
    .filter((k) => gecerliIdler.has(k.id))
    .map((k) =>
      prisma.table.update({
        where: { id: k.id },
        data: { planX: planKonumuKirp(k.x), planY: planKonumuKirp(k.y) },
      }),
    );

  if (guncellemeler.length === 0) return { error: "Kaydedilecek masa yok." };

  await prisma.$transaction(guncellemeler);

  await denetimYaz(actor, "rezervasyon.planKaydet", {
    entity: "business",
    entityId: businessId,
    detail: `Kat planı güncellendi (${guncellemeler.length} masa)`,
  });

  revalidatePath(YOL);
  revalidatePath(`${YOL}/plan`);
  return { saved: `Kat planı kaydedildi (${guncellemeler.length} masa).` };
}

// --- Rezervasyon -----------------------------------------------------

/** Çakışma kontrolü için o günün kayıtlarını çeker. */
async function gununRezervasyonlari(
  businessId: string,
  baslangic: Date,
  bitis: Date,
): Promise<MevcutRezervasyon[]> {
  // Pencere bilerek geniş: temizlik payı ve komşu rezervasyonlar da
  // hesaba katılmalı.
  const alt = new Date(baslangic.getTime() - 24 * 60 * 60 * 1000);
  const ust = new Date(bitis.getTime() + 24 * 60 * 60 * 1000);

  const kayitlar = await prisma.rezervasyon.findMany({
    where: { businessId, baslangic: { gte: alt, lte: ust } },
    select: {
      id: true,
      baslangic: true,
      bitis: true,
      durum: true,
      masalar: { select: { tableId: true } },
    },
  });

  return kayitlar.map((k) => ({
    id: k.id,
    baslangic: k.baslangic,
    bitis: k.bitis,
    durum: k.durum,
    masaIdleri: k.masalar.map((m) => m.tableId),
  }));
}

export async function rezervasyonKaydet(
  _prev: RezervasyonFormState,
  formData: FormData,
): Promise<RezervasyonFormState> {
  const businessId = metin(formData, "businessId");
  const actor = await yetkiliMi(businessId);
  if (!actor) return { error: "Bu işletmeye yetkiniz yok." };

  const duzenlenenId = metin(formData, "rezervasyonId") || null;
  const misafirAdi = metin(formData, "misafirAdi");
  const telefon = metin(formData, "telefon") || null;
  const notMetni = metin(formData, "not") || null;
  const kisiSayisi = Number(formData.get("kisiSayisi") ?? 0);
  const masaIdleri = formData.getAll("masaIdleri").map((m) => String(m)).filter(Boolean);

  const baslangic = new Date(metin(formData, "baslangic"));
  const bitis = new Date(metin(formData, "bitis"));

  const hatalar = rezervasyonDogrula({
    misafirAdi,
    kisiSayisi,
    baslangic,
    bitis,
    masaIdleri,
  });
  if (hatalar.length > 0) return { error: hatalar[0].mesaj };

  // Masalar gerçekten bu işletmenin mi.
  const masalar = await prisma.table.findMany({
    where: { id: { in: masaIdleri }, businessId },
    select: { id: true, kapasite: true, tableNumber: true },
  });
  if (masalar.length !== masaIdleri.length) return { error: "Seçilen masa bulunamadı." };

  const mevcutlar = await gununRezervasyonlari(businessId, baslangic, bitis);
  const cakisma = cakismaBul(
    { baslangic, bitis, masaIdleri },
    mevcutlar,
    { haricRezervasyonId: duzenlenenId ?? undefined },
  );

  if (cakisma.cakisiyor) {
    const doluMasaIdleri = new Set(cakisma.catismalar.flatMap((c) => c.masaIdleri));
    const adlar = masalar
      .filter((m) => doluMasaIdleri.has(m.id))
      .map((m) => `Masa ${m.tableNumber}`)
      .join(", ");
    return {
      error: `Bu saatte ${adlar} zaten dolu. Başka saat ya da masa seçin.`,
    };
  }

  const kapasite = kapasiteYeterliMi(masalar, kisiSayisi);
  const kapasiteNotu = kapasite.uygun
    ? ""
    : ` (Dikkat: kapasite ${kapasite.toplamKapasite}, ${kapasite.eksik} kişi fazla.)`;

  const durumHam = metin(formData, "durum");
  const durum = gecerliDurumMu(durumHam) ? durumHam : "onaylandi";
  const kanalHam = metin(formData, "kanal");
  const kanal = gecerliKanalMi(kanalHam) ? kanalHam : "panel";

  const veri = {
    businessId,
    misafirAdi,
    telefon,
    not: notMetni,
    kisiSayisi: Math.trunc(kisiSayisi),
    baslangic,
    bitis,
    durum,
    kanal,
    olusturanId: actor.id,
  };

  if (duzenlenenId) {
    const mevcut = await prisma.rezervasyon.findFirst({
      where: { id: duzenlenenId, businessId },
    });
    if (!mevcut) return { error: "Rezervasyon bulunamadı." };

    // Masa listesi baştan kuruluyor: birleştirmeden vazgeçilmiş olabilir.
    await prisma.$transaction([
      prisma.rezervasyonMasa.deleteMany({ where: { rezervasyonId: duzenlenenId } }),
      prisma.rezervasyon.update({ where: { id: duzenlenenId }, data: veri }),
      prisma.rezervasyonMasa.createMany({
        data: masaIdleri.map((tableId) => ({ rezervasyonId: duzenlenenId, tableId })),
      }),
    ]);

    await denetimYaz(actor, "rezervasyon.guncelle", {
      entity: "business",
      entityId: businessId,
      detail: `Rezervasyon güncellendi: ${misafirAdi}`,
    });

    revalidatePath(YOL);
    return { saved: `Rezervasyon güncellendi.${kapasiteNotu}` };
  }

  const olusan = await prisma.rezervasyon.create({ data: veri });
  await prisma.rezervasyonMasa.createMany({
    data: masaIdleri.map((tableId) => ({ rezervasyonId: olusan.id, tableId })),
  });

  await denetimYaz(actor, "rezervasyon.olustur", {
    entity: "business",
    entityId: businessId,
    detail: `Rezervasyon: ${misafirAdi} · ${kisiSayisi} kişi · ${masalar.length} masa`,
  });

  revalidatePath(YOL);
  return { saved: `Rezervasyon oluşturuldu.${kapasiteNotu}` };
}

export async function rezervasyonDurumDegistir(
  _prev: RezervasyonFormState,
  formData: FormData,
): Promise<RezervasyonFormState> {
  const businessId = metin(formData, "businessId");
  const actor = await yetkiliMi(businessId);
  if (!actor) return { error: "Bu işletmeye yetkiniz yok." };

  const rezervasyonId = metin(formData, "rezervasyonId");
  const durumHam = metin(formData, "durum");
  if (!gecerliDurumMu(durumHam)) return { error: "Geçersiz durum." };

  const mevcut = await prisma.rezervasyon.findFirst({
    where: { id: rezervasyonId, businessId },
    select: { misafirAdi: true },
  });
  if (!mevcut) return { error: "Rezervasyon bulunamadı." };

  await prisma.rezervasyon.update({
    where: { id: rezervasyonId },
    data: { durum: durumHam },
  });

  await denetimYaz(actor, "rezervasyon.durum", {
    entity: "business",
    entityId: businessId,
    detail: `${mevcut.misafirAdi} → ${durumHam}`,
  });

  revalidatePath(YOL);
  return { saved: "Durum güncellendi." };
}
