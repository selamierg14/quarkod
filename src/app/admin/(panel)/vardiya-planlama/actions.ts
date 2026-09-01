"use server";

import { revalidatePath } from "next/cache";
import { canAccessBusiness, requirePersonelYonetimi, requireYazma } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { gunAdi, gunBaslangici, gunEkle, gunGirdisi, haftaBaslangici } from "@/lib/gun";
import { etkinVardiyalar, gecerliVardiyaMi } from "@/lib/vardiya";
import { csvAyristir, tabloyuCizelgeyeCevir } from "@/lib/vardiya-tablo";
import { izinKumesiKur, izinliMi } from "@/lib/izin";
import { denetimYaz } from "@/lib/denetim";
import { bildirimGonder } from "@/lib/bildirim";
import { SHIFTS, type Shift } from "@/lib/constants";

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

  let atandi = false;
  try {
    await prisma.shiftAssignment.create({
      data: { businessId, userId, date, shift },
    });
    atandi = true;
  } catch {
    // Zaten atanmış (tekillik hatası) — sessizce yut, aynı sonuca varır.
  }

  // Bildirim yalnızca GERÇEKTEN yeni bir atamada gider: zaten atanmışken
  // aynı hücreye tekrar basmak (çift tıklama, form yeniden gönderimi)
  // personele aynı "vardiyana atandın" mesajını ikinci kez düşürmemeli.
  if (atandi) {
    await bildirimGonder([userId], {
      tur: "vardiya.atandi",
      baslik: "Vardiyaya atandın",
      govde: `${gunAdi(date)} ${SHIFTS[shift as Shift]} vardiyasına atandın.`,
      url: "/admin/vardiyalarim",
    });
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

function etiketle(tarih: Date, vardiya: string, isletmeAdi?: string): string {
  const temel = `${gunAdi(tarih)} ${SHIFTS[vardiya as Shift] ?? vardiya}`;
  return isletmeAdi ? `${temel} · ${isletmeAdi}` : temel;
}

/**
 * Değişim/bırakma talebine karar.
 *
 * Dört hâl (bkz. lib/vardiya-degisim.ts):
 * - Reddet: her zaman mümkün, yalnızca bu talebi kapatır.
 * - Hedefsiz onay: eski davranış — atama kalkar, kimse otomatik gelmez.
 * - Eşleşen onay: karşı tarafta tam tersini isteyen bekleyen bir talep
 *   varsa, TEK onay ikisini birden karşılıklı takas eder.
 * - Hedefli onay (eşleşme yok): hedef hücre boşsa kişi doğrudan oraya
 *   taşınır; doluysa (UI zaten onay düğmesi göstermiyor ama savunma amaçlı)
 *   hiçbir şey yapılmaz.
 */
export async function degisimKararVer(formData: FormData): Promise<void> {
  const actor = await requirePersonelYonetimi();
  await requireYazma();

  const id = String(formData.get("id") ?? "");
  const karar = String(formData.get("karar") ?? "");
  if (!["onayla", "reddet"].includes(karar)) return;

  const talep = await prisma.shiftSwapRequest.findUnique({
    where: { id },
    include: { assignment: { include: { business: { select: { name: true } } } } },
  });
  if (!talep || talep.status !== "bekliyor") return;
  if (!(await canAccessBusiness(actor, talep.assignment.businessId))) return;

  const kaynakEtiket = etiketle(
    talep.assignment.date,
    talep.assignment.shift,
    talep.assignment.business.name,
  );

  if (karar === "reddet") {
    await prisma.shiftSwapRequest.update({
      where: { id },
      data: { status: "reddedildi", decidedById: actor.id, decidedAt: new Date() },
    });
    await denetimYaz(actor, "business.vardiya", {
      entity: "shiftSwapRequest",
      entityId: id,
      detail: `${kaynakEtiket} değişim/bırakma talebi reddedildi`,
    });
    await bildirimGonder([talep.requestedById], {
      tur: "vardiya.degisim.karar",
      baslik: "Vardiya talebin reddedildi",
      govde: `${kaynakEtiket} — bu vardiyada kalmaya devam ediyorsun.`,
      url: "/admin/vardiyalarim",
    });
    revalidatePath("/admin/vardiya-planlama");
    revalidatePath("/admin/vardiyalarim");
    return;
  }

  // --- Onay ---

  if (!talep.hedefTarih || !talep.hedefVardiya) {
    // Hedefsiz: yalnızca boşalt.
    await prisma.$transaction([
      prisma.shiftSwapRequest.update({
        where: { id },
        data: { status: "onaylandi", decidedById: actor.id, decidedAt: new Date() },
      }),
      prisma.shiftAssignment.delete({ where: { id: talep.assignmentId } }),
    ]);
    await denetimYaz(actor, "business.vardiya", {
      entity: "shiftSwapRequest",
      entityId: id,
      detail: `${kaynakEtiket} bırakma talebi onaylandı, vardiya boşaltıldı`,
    });
    await bildirimGonder([talep.requestedById], {
      tur: "vardiya.degisim.karar",
      baslik: "Vardiya bırakma talebin onaylandı",
      govde: `${kaynakEtiket} — vardiya boşaltıldı, yerine kimse otomatik atanmadı.`,
      url: "/admin/vardiyalarim",
    });
    revalidatePath("/admin/vardiya-planlama");
    revalidatePath("/admin/vardiyalarim");
    return;
  }

  const hedefEtiket = etiketle(talep.hedefTarih, talep.hedefVardiya, talep.assignment.business.name);

  // Karşı tarafta tam tersini isteyen bekleyen bir talep var mı — aynı
  // işletmenin tüm bekleyen talepleri arasından aranıyor (kaynak hafta ile
  // sınırlı değil, hedef başka bir haftaya düşebilir).
  const digerBekleyenler = await prisma.shiftSwapRequest.findMany({
    where: {
      status: "bekliyor",
      id: { not: id },
      assignment: { businessId: talep.assignment.businessId },
    },
    include: { assignment: true },
  });
  const esleşen = digerBekleyenler.find(
    (d) =>
      d.hedefTarih &&
      d.hedefVardiya &&
      d.assignment.date.getTime() === talep.hedefTarih!.getTime() &&
      d.assignment.shift === talep.hedefVardiya &&
      d.hedefTarih.getTime() === talep.assignment.date.getTime() &&
      d.hedefVardiya === talep.assignment.shift,
  );

  if (esleşen) {
    try {
      await prisma.$transaction([
        prisma.shiftSwapRequest.update({
          where: { id: talep.id },
          data: { status: "onaylandi", decidedById: actor.id, decidedAt: new Date() },
        }),
        prisma.shiftSwapRequest.update({
          where: { id: esleşen.id },
          data: { status: "onaylandi", decidedById: actor.id, decidedAt: new Date() },
        }),
        prisma.shiftAssignment.update({
          where: { id: talep.assignmentId },
          data: { date: talep.hedefTarih, shift: talep.hedefVardiya },
        }),
        prisma.shiftAssignment.update({
          where: { id: esleşen.assignmentId },
          data: { date: esleşen.hedefTarih!, shift: esleşen.hedefVardiya! },
        }),
      ]);
    } catch {
      // Tekillik hatası (biri araya girip aynı hücreye başka bir atama
      // koymuş olabilir) — sessizce yut, talep "bekliyor" kalır, yönetici
      // tekrar dener.
      return;
    }

    await denetimYaz(actor, "business.vardiya", {
      entity: "shiftSwapRequest",
      entityId: id,
      detail: `${kaynakEtiket} ↔ ${hedefEtiket} karşılıklı değişim onaylandı`,
    });
    await bildirimGonder([talep.requestedById], {
      tur: "vardiya.degisim.karar",
      baslik: "Vardiya değişim talebin onaylandı",
      govde: `Artık ${hedefEtiket} çalışıyorsun (önceden ${kaynakEtiket}).`,
      url: "/admin/vardiyalarim",
    });
    await bildirimGonder([esleşen.requestedById], {
      tur: "vardiya.degisim.karar",
      baslik: "Vardiya değişim talebin onaylandı",
      govde: `Artık ${kaynakEtiket} çalışıyorsun (önceden ${hedefEtiket}).`,
      url: "/admin/vardiyalarim",
    });
    revalidatePath("/admin/vardiya-planlama");
    revalidatePath("/admin/vardiyalarim");
    return;
  }

  // Eşleşme yok — hedef hücre gerçekten boş mu (savunma: UI zaten doluysa
  // onay düğmesi göstermiyor, ama form doğrudan da çağrılabilir).
  const dolduran = await prisma.shiftAssignment.findFirst({
    where: {
      businessId: talep.assignment.businessId,
      date: talep.hedefTarih,
      shift: talep.hedefVardiya,
    },
  });
  if (dolduran) return;

  try {
    await prisma.$transaction([
      prisma.shiftSwapRequest.update({
        where: { id },
        data: { status: "onaylandi", decidedById: actor.id, decidedAt: new Date() },
      }),
      prisma.shiftAssignment.update({
        where: { id: talep.assignmentId },
        data: { date: talep.hedefTarih, shift: talep.hedefVardiya },
      }),
    ]);
  } catch {
    return;
  }

  await denetimYaz(actor, "business.vardiya", {
    entity: "shiftSwapRequest",
    entityId: id,
    detail: `${kaynakEtiket} → ${hedefEtiket} değişim talebi onaylandı`,
  });
  await bildirimGonder([talep.requestedById], {
    tur: "vardiya.degisim.karar",
    baslik: "Vardiya değişim talebin onaylandı",
    govde: `Artık ${hedefEtiket} çalışıyorsun (önceden ${kaynakEtiket}).`,
    url: "/admin/vardiyalarim",
  });
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

/* --------------------------------------------------- geçen haftayı kopyala */

export type HaftaKopyaState = { error?: string; saved?: string };

/**
 * Bir önceki haftanın çizelgesini bu haftaya kopyalar.
 *
 * Çizelgeler haftadan haftaya büyük ölçüde aynı kalıyor; 7 gün × 4 vardiya
 * eden ızgarayı her hafta elle kurmak (ya da Excel'e gidip gelmek) işin
 * en tekrarlı parçasıydı.
 *
 * Ekleme mantığı içe aktarmayla aynı: var olan atamalara dokunulmuyor,
 * yalnızca eksikler açılıyor. Onaylı izne denk gelen günler atlanıyor —
 * geçen hafta çalışan biri bu hafta izinliyse onu otomatik yazmak, izin
 * takviminin varlık sebebine aykırı olurdu.
 */
export async function gecenHaftayiKopyala(
  _prev: HaftaKopyaState,
  formData: FormData,
): Promise<HaftaKopyaState> {
  const actor = await requirePersonelYonetimi();
  await requireYazma();

  const businessId = String(formData.get("businessId") ?? "");
  if (!(await canAccessBusiness(actor, businessId))) {
    return { error: "Bu işletmeye yetkiniz yok." };
  }

  const haftaBasi = haftaBaslangici(
    new Date(String(formData.get("baslangic") ?? "") || Date.now()),
  );
  const haftaSonu = gunEkle(haftaBasi, 6);
  const oncekiBasi = gunEkle(haftaBasi, -7);
  const oncekiSonu = gunEkle(haftaBasi, -1);

  const [onceki, mevcut, izinler] = await Promise.all([
    prisma.shiftAssignment.findMany({
      where: {
        businessId,
        date: { gte: oncekiBasi, lte: oncekiSonu },
        // Pasifleştirilmiş biri geçen hafta çalışmış olabilir ama yeni
        // haftaya kopyalanacak atama GELECEĞE ait — artık aktif olmayan
        // birini oraya yazmak, tam da bu kopyalamanın çözmeye çalıştığı
        // "boş vardiya" sorununu gizli şekilde geri getirirdi.
        user: { active: true },
      },
      select: { userId: true, date: true, shift: true },
    }),
    prisma.shiftAssignment.findMany({
      where: { businessId, date: { gte: haftaBasi, lte: haftaSonu } },
      select: { userId: true, date: true, shift: true },
    }),
    prisma.leaveRequest.findMany({
      where: {
        businessId,
        status: "onaylandi",
        baslangic: { lte: haftaSonu },
        bitis: { gte: haftaBasi },
      },
      select: { userId: true, baslangic: true, bitis: true, tur: true, status: true },
    }),
  ]);

  if (onceki.length === 0) {
    return { error: "Geçen hafta çizelgesi boş; kopyalanacak bir şey yok." };
  }

  const izinKumesi = izinKumesiKur(izinler);
  const mevcutAnahtarlar = new Set(
    mevcut.map((a) => `${a.userId}|${gunGirdisi(a.date)}|${a.shift}`),
  );

  const eklenecek: { businessId: string; userId: string; date: Date; shift: string }[] = [];
  let izinNedeniyleAtlanan = 0;

  for (const atama of onceki) {
    // Geçen haftanın aynı günü: tam 7 gün ileri.
    const yeniTarih = gunBaslangici(gunEkle(atama.date, 7));
    const gunAnahtari = gunGirdisi(yeniTarih);

    if (izinliMi(izinKumesi, atama.userId, gunAnahtari)) {
      izinNedeniyleAtlanan++;
      continue;
    }
    if (mevcutAnahtarlar.has(`${atama.userId}|${gunAnahtari}|${atama.shift}`)) continue;

    eklenecek.push({ businessId, userId: atama.userId, date: yeniTarih, shift: atama.shift });
  }

  if (eklenecek.length > 0) {
    await prisma.shiftAssignment.createMany({ data: eklenecek, skipDuplicates: true });
  }

  await denetimYaz(actor, "business.vardiya", {
    entity: "shiftAssignment",
    entityId: businessId,
    detail: `Geçen hafta kopyalandı (${gunGirdisi(haftaBasi)}): ${eklenecek.length} vardiya`,
  });

  revalidatePath("/admin/vardiya-planlama");
  revalidatePath("/admin/vardiyalarim");

  if (eklenecek.length === 0) {
    return {
      saved:
        izinNedeniyleAtlanan > 0
          ? `Eklenecek yeni vardiya yok (${izinNedeniyleAtlanan} tanesi izne denk geldiği için atlandı).`
          : "Bu hafta zaten geçen haftayla aynı.",
    };
  }

  return {
    saved:
      `${eklenecek.length} vardiya kopyalandı.` +
      (izinNedeniyleAtlanan > 0
        ? ` ${izinNedeniyleAtlanan} tanesi izne denk geldiği için atlandı.`
        : ""),
  };
}
