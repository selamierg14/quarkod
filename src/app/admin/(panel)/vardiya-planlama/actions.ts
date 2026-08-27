"use server";

import { revalidatePath } from "next/cache";
import { canAccessBusiness, requirePersonelYonetimi, requireYazma } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { gunBaslangici, gunEkle, gunGirdisi, haftaBaslangici } from "@/lib/gun";
import { etkinVardiyalar, gecerliVardiyaMi } from "@/lib/vardiya";
import { csvAyristir, tabloyuCizelgeyeCevir } from "@/lib/vardiya-tablo";
import { denetimYaz } from "@/lib/denetim";

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

/* ------------------------------------------------------------ excel içe aktarma */

export type CizelgeIceAktarState = {
  error?: string;
  saved?: string;
  uyarilar?: string[];
};

/** Tek seferde okunacak en büyük dosya — çizelge birkaç KB'dir. */
const EN_BUYUK_DOSYA = 1_000_000;

/**
 * Haftalık çizelgeyi Excel dosyasından kurar.
 *
 * Varsayılan davranış EKLEMELİ: dosyadaki atamalar açılır, dosyada
 * olmayanlara dokunulmaz. Çizelge bir "dosyanın kopyası" değil, üzerinde
 * çalışılan canlı bir plan — biri panelden vardiya eklerken başka biri
 * eski bir dosyayı yüklediğinde o eklemelerin sessizce silinmesi en kötü
 * sonuç olurdu.
 *
 * "Dosyada olmayanları kaldır" ayrıca ve açıkça işaretlenirse o haftanın
 * fazlalıkları temizlenir; bu durumda bile yalnızca İÇE AKTARILAN HAFTA
 * ve seçili işletme kapsamında kalınır.
 */
export async function cizelgeyiIceAktar(
  _prev: CizelgeIceAktarState,
  formData: FormData,
): Promise<CizelgeIceAktarState> {
  const actor = await requirePersonelYonetimi();
  await requireYazma();

  const businessId = String(formData.get("businessId") ?? "");
  if (!(await canAccessBusiness(actor, businessId))) {
    return { error: "Bu işletmeye yetkiniz yok." };
  }

  const dosya = formData.get("dosya");
  if (!(dosya instanceof File) || dosya.size === 0) {
    return { error: "Bir dosya seçin." };
  }
  if (dosya.size > EN_BUYUK_DOSYA) {
    return { error: "Dosya çok büyük (en fazla 1 MB)." };
  }

  const isletme = await prisma.business.findUnique({ where: { id: businessId } });
  if (!isletme) return { error: "İşletme bulunamadı." };

  const haftaBasi = haftaBaslangici(
    new Date(String(formData.get("baslangic") ?? "") || Date.now()),
  );
  const gunler = Array.from({ length: 7 }, (_, i) => gunEkle(haftaBasi, i));

  const personel = await prisma.user.findMany({
    where: { businessId, active: true, role: { in: ["manager", "garson"] } },
    select: { id: true, name: true },
  });
  if (personel.length === 0) {
    return { error: "Bu işletmede önce personel tanımlayın." };
  }

  const { atamalar, uyarilar } = tabloyuCizelgeyeCevir(
    csvAyristir(await dosya.text()),
    personel,
    gunler,
    etkinVardiyalar(isletme),
  );

  if (atamalar.length === 0) {
    return {
      error: "Dosyadan hiçbir vardiya okunamadı.",
      uyarilar: uyarilar.slice(0, 20),
    };
  }

  const mevcut = await prisma.shiftAssignment.findMany({
    where: { businessId, date: { gte: haftaBasi, lte: gunler[6] } },
    select: { id: true, userId: true, date: true, shift: true },
  });
  const mevcutAnahtarlari = new Map(
    mevcut.map((a) => [`${a.userId}|${gunGirdisi(a.date)}|${a.shift}`, a.id]),
  );

  const eklenecek = atamalar.filter(
    (a) => !mevcutAnahtarlari.has(`${a.userId}|${a.gun}|${a.shift}`),
  );

  const dosyadakiAnahtarlar = new Set(
    atamalar.map((a) => `${a.userId}|${a.gun}|${a.shift}`),
  );
  const fazlalik = mevcut.filter(
    (a) => !dosyadakiAnahtarlar.has(`${a.userId}|${gunGirdisi(a.date)}|${a.shift}`),
  );

  const kaldir = formData.get("kaldir") === "on";

  if (eklenecek.length > 0) {
    await prisma.shiftAssignment.createMany({
      data: eklenecek.map((a) => ({
        businessId,
        userId: a.userId,
        date: gunBaslangici(new Date(a.gun)),
        shift: a.shift,
      })),
      // Aynı anda panelden de atama yapılmışsa tekillik hatası almayalım.
      skipDuplicates: true,
    });
  }

  if (kaldir && fazlalik.length > 0) {
    await prisma.shiftAssignment.deleteMany({
      where: { id: { in: fazlalik.map((a) => a.id) } },
    });
  }

  await denetimYaz(actor, "business.vardiya", {
    entity: "shiftAssignment",
    entityId: businessId,
    detail:
      `Çizelge içe aktarıldı (${gunGirdisi(haftaBasi)} haftası): ` +
      `${eklenecek.length} eklendi` +
      (kaldir ? `, ${fazlalik.length} kaldırıldı` : ""),
  });

  revalidatePath("/admin/vardiya-planlama");
  revalidatePath("/admin/vardiyalarim");

  const parcalar = [`${eklenecek.length} vardiya eklendi`];
  if (kaldir) {
    parcalar.push(`${fazlalik.length} vardiya kaldırıldı`);
  } else if (fazlalik.length > 0) {
    parcalar.push(
      `dosyada olmayan ${fazlalik.length} vardiya korundu ` +
        `(kaldırmak için kutuyu işaretleyin)`,
    );
  }

  return { saved: parcalar.join(", ") + ".", uyarilar: uyarilar.slice(0, 20) };
}
