"use server";

import { revalidatePath } from "next/cache";
import {
  canAccessBusiness,
  requirePersonelYonetimi,
  requireUser,
  requireYazma,
} from "@/lib/auth";
import { prisma } from "@/lib/db";
import { bildirimGonder } from "@/lib/bildirim";
import { denetimYaz } from "@/lib/denetim";
import { gunBaslangici } from "@/lib/gun";
import { araliklarKesisiyorMu, gecerliIzinTuru } from "@/lib/izin";

/** İki tarih aynı günse tek gün, değilse aralık olarak yazar. */
function tarihAraligiYaz(baslangic: Date, bitis: Date): string {
  const b = baslangic.toLocaleDateString("tr-TR");
  const s = bitis.toLocaleDateString("tr-TR");
  return b === s ? b : `${b} – ${s}`;
}

export type IzinFormState = { error?: string; saved?: string };

/** En fazla bir yıllık aralık — yanlış girilmiş tarihler tabloyu şişirmesin. */
const EN_UZUN_GUN = 366;

function tarihOku(value: FormDataEntryValue | null): Date | null {
  const metin = String(value ?? "").trim();
  if (!metin) return null;
  const d = new Date(metin);
  return Number.isNaN(d.getTime()) ? null : gunBaslangici(d);
}

/**
 * Aynı kişi için çakışan, hâlâ geçerli (bekleyen ya da onaylı) bir izin
 * var mı. Reddedilmiş kayıtlar engel değil: aynı tarihe yeniden talep
 * açılabilmeli.
 */
async function cakisanIzinVarMi(
  userId: string,
  baslangic: Date,
  bitis: Date,
  haricId?: string,
): Promise<boolean> {
  const mevcut = await prisma.leaveRequest.findMany({
    where: {
      userId,
      status: { in: ["bekliyor", "onaylandi"] },
      ...(haricId ? { NOT: { id: haricId } } : {}),
    },
    select: { baslangic: true, bitis: true },
  });
  return mevcut.some((i) => araliklarKesisiyorMu(baslangic, bitis, i.baslangic, i.bitis));
}

/** Ortak doğrulama: tarih aralığı ve tür. */
function araligiDogrula(
  baslangic: Date | null,
  bitis: Date | null,
  tur: string,
): string | null {
  if (!baslangic || !bitis) return "Başlangıç ve bitiş tarihi gerekli.";
  if (bitis < baslangic) return "Bitiş tarihi başlangıçtan önce olamaz.";
  const gunSayisi = Math.round((bitis.getTime() - baslangic.getTime()) / 86_400_000) + 1;
  if (gunSayisi > EN_UZUN_GUN) return "İzin aralığı bir yılı geçemez.";
  if (!gecerliIzinTuru(tur)) return "Geçerli bir izin türü seçin.";
  return null;
}

/**
 * Personelin kendi izin talebi.
 *
 * Vardiya değişim talebiyle (ShiftSwapRequest) aynı akış: kayıt "bekliyor"
 * doğar, çizelgeyi kuran kişi onaylayana kadar çizelgeye hiç yansımaz.
 */
export async function izinTalepEt(
  _prev: IzinFormState,
  formData: FormData,
): Promise<IzinFormState> {
  const user = await requireUser();
  await requireYazma();

  if (!user.businessId) {
    return { error: "Hesabınız bir işletmeye bağlı değil." };
  }

  const baslangic = tarihOku(formData.get("baslangic"));
  const bitis = tarihOku(formData.get("bitis"));
  const tur = String(formData.get("tur") ?? "yillik");

  const hata = araligiDogrula(baslangic, bitis, tur);
  if (hata) return { error: hata };

  if (await cakisanIzinVarMi(user.id, baslangic!, bitis!)) {
    return { error: "Bu tarihlerde zaten bekleyen ya da onaylı bir izniniz var." };
  }

  await prisma.leaveRequest.create({
    data: {
      businessId: user.businessId,
      userId: user.id,
      baslangic: baslangic!,
      bitis: bitis!,
      tur,
      aciklama: String(formData.get("aciklama") ?? "").trim().slice(0, 200) || null,
      status: "bekliyor",
    },
  });

  // Hesabın sahibi + bu işletmenin sorumlusu: onaylama yetkisi kimdeyse
  // haber ona gider. notifyLowRating'deki (lib/mail.ts) alıcı kuralıyla
  // aynı — kural iki yerde ayrı yaşıyor çünkü biri hesap+işletme bazlı
  // Business üzerinden, diğeri (burası) doğrudan oturumdaki accountId
  // üzerinden sorguluyor; tek fonksiyona çıkarmak bu değişikliğin kapsamını
  // aşardı.
  const yoneticiler = await prisma.user.findMany({
    where: {
      active: true,
      accountId: user.accountId,
      OR: [{ role: "owner" }, { role: "manager", businessId: user.businessId }],
    },
    select: { id: true },
  });
  await bildirimGonder(
    yoneticiler.map((y) => y.id),
    {
      tur: "izin.talep",
      baslik: "Yeni izin talebi",
      govde: `${user.name} — ${tarihAraligiYaz(baslangic!, bitis!)}`,
      url: "/admin/vardiya-planlama/izinler",
    },
  );

  revalidatePath("/admin/vardiyalarim");
  revalidatePath("/admin/vardiya-planlama");
  revalidatePath("/admin/vardiya-planlama/izinler");
  return { saved: "İzin talebiniz yöneticinize iletildi." };
}

/**
 * Yöneticinin doğrudan izin girmesi.
 *
 * Kayıt onaylı doğar: giren kişi zaten onaylama yetkisine sahip. Sözlü
 * verilmiş bir izni ya da sonradan gelen raporu kayda geçirmenin yolu bu.
 */
export async function izinEkle(
  _prev: IzinFormState,
  formData: FormData,
): Promise<IzinFormState> {
  const actor = await requirePersonelYonetimi();
  await requireYazma();

  const businessId = String(formData.get("businessId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  if (!(await canAccessBusiness(actor, businessId))) {
    return { error: "Bu işletmeye yetkiniz yok." };
  }

  // Personel gerçekten bu işletmenin mi — form değiştirilip başka
  // kiracının kullanıcısına izin yazılamasın.
  const personel = await prisma.user.findFirst({
    where: { id: userId, businessId },
    select: { name: true },
  });
  if (!personel) return { error: "Personel bulunamadı." };

  const baslangic = tarihOku(formData.get("baslangic"));
  const bitis = tarihOku(formData.get("bitis"));
  const tur = String(formData.get("tur") ?? "yillik");

  const hata = araligiDogrula(baslangic, bitis, tur);
  if (hata) return { error: hata };

  if (await cakisanIzinVarMi(userId, baslangic!, bitis!)) {
    return { error: `${personel.name} için bu tarihlerde zaten bir izin kaydı var.` };
  }

  await prisma.leaveRequest.create({
    data: {
      businessId,
      userId,
      baslangic: baslangic!,
      bitis: bitis!,
      tur,
      aciklama: String(formData.get("aciklama") ?? "").trim().slice(0, 200) || null,
      status: "onaylandi",
      decidedById: actor.id,
      decidedAt: new Date(),
    },
  });

  await denetimYaz(actor, "business.izin", {
    entity: "leaveRequest",
    entityId: businessId,
    detail: `${personel.name} için izin girildi`,
  });

  revalidatePath("/admin/vardiya-planlama");
  revalidatePath("/admin/vardiya-planlama/izinler");
  revalidatePath("/admin/vardiyalarim");
  return { saved: `${personel.name} için izin kaydedildi.` };
}

/** Bekleyen bir izin talebini onaylar ya da reddeder. */
export async function izinKararVer(formData: FormData): Promise<void> {
  const actor = await requirePersonelYonetimi();
  await requireYazma();

  const id = String(formData.get("id") ?? "");
  const karar = String(formData.get("karar") ?? "");
  if (!["onayla", "reddet"].includes(karar)) return;

  const talep = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { user: { select: { name: true } } },
  });
  if (!talep || talep.status !== "bekliyor") return;
  if (!(await canAccessBusiness(actor, talep.businessId))) return;

  const onaylandi = karar === "onayla";

  await prisma.leaveRequest.update({
    where: { id },
    data: {
      status: onaylandi ? "onaylandi" : "reddedildi",
      decidedById: actor.id,
      decidedAt: new Date(),
    },
  });

  await denetimYaz(actor, "business.izin", {
    entity: "leaveRequest",
    entityId: id,
    detail: `${talep.user.name} izni ${onaylandi ? "onaylandı" : "reddedildi"}`,
  });

  await bildirimGonder([talep.userId], {
    tur: "izin.karar",
    baslik: onaylandi ? "İzin talebin onaylandı" : "İzin talebin reddedildi",
    govde: tarihAraligiYaz(talep.baslangic, talep.bitis),
    url: "/admin/vardiyalarim",
  });

  revalidatePath("/admin/vardiya-planlama");
  revalidatePath("/admin/vardiya-planlama/izinler");
  revalidatePath("/admin/vardiyalarim");
}

/**
 * İzin kaydını geri alır.
 *
 * Silme değil, "reddedildi"ye çekme: kaydın kimin ne zaman istediği ve
 * kimin geri aldığı izi kalsın — çizelge tartışmalarının çözüldüğü yer
 * genelde burası oluyor.
 */
export async function izniGeriAl(formData: FormData): Promise<void> {
  const actor = await requirePersonelYonetimi();
  await requireYazma();

  const id = String(formData.get("id") ?? "");
  const izin = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { user: { select: { name: true } } },
  });
  if (!izin || izin.status === "reddedildi") return;
  if (!(await canAccessBusiness(actor, izin.businessId))) return;

  await prisma.leaveRequest.update({
    where: { id },
    data: { status: "reddedildi", decidedById: actor.id, decidedAt: new Date() },
  });

  await denetimYaz(actor, "business.izin", {
    entity: "leaveRequest",
    entityId: id,
    detail: `${izin.user.name} izni geri alındı`,
  });

  revalidatePath("/admin/vardiya-planlama");
  revalidatePath("/admin/vardiya-planlama/izinler");
  revalidatePath("/admin/vardiyalarim");
}
