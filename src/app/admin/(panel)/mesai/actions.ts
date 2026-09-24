"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/cekirdek/db";
import {
  canAccessBusiness,
  requireMesaiErisim,
  requireYazma,
} from "@/lib/kimlik/auth";
import { istemciIp, ipOzeti } from "@/lib/kimlik/istemci-ip";
import { denetimYaz } from "@/lib/rapor/denetim";
import {
  duzeltmeGecerliMi,
  ipleriCoz,
  ipleriYaz,
  okutmaKarari,
  sureMetni,
} from "@/lib/personel/mesai";

export type MesaiFormState = { error?: string; saved?: string };

const YOL = "/admin/mesai";

/** Ortak kapı: modül + yazma yetkisi + işletme sahipliği. */
async function yetkiliMi(businessId: string) {
  const actor = await requireMesaiErisim();
  await requireYazma();
  if (!businessId || !(await canAccessBusiness(actor, businessId))) return null;
  return actor;
}

function metin(formData: FormData, alan: string): string {
  return String(formData.get(alan) ?? "").trim();
}

/**
 * QR kodunu üretir ya da yeniler.
 *
 * Yenileme ESKİSİNİ GEÇERSİZ KILIYOR: asılı kâğıdın fotoğrafı sızdıysa
 * ya da işten ayrılan biri elinde tuttuysa, tek çare adresin
 * değişmesi. Bu yüzden düğme "yenile" diyor ve yeni QR'ın basılması
 * gerektiğini söylüyor.
 */
export async function qrOlustur(
  _prev: MesaiFormState,
  formData: FormData,
): Promise<MesaiFormState> {
  const businessId = metin(formData, "businessId");
  const actor = await yetkiliMi(businessId);
  if (!actor) return { error: "Bu işletmeye yetkiniz yok." };

  const token = randomBytes(18).toString("base64url");
  await prisma.business.update({ where: { id: businessId }, data: { mesaiQrToken: token } });

  await denetimYaz(actor, "mesai.qr", {
    entity: "business",
    entityId: businessId,
    detail: "Mesai QR kodu üretildi/yenilendi",
  });

  revalidatePath(YOL);
  return { saved: "Yeni QR hazır. Eskisi artık çalışmıyor — yazdırıp değiştirin." };
}

/**
 * İsteğin geldiği IP'yi izinli listeye ekler.
 *
 * Yönetici işletmenin Wi-Fi'ındayken tıklıyor ve sistem kendi IP'sini
 * öğreniyor. Elle IP yazdırmak, "genel IP nedir" sorusunu kafe
 * sahibine sormak demekti; üstelik kafelerin IP'si dinamik olduğu için
 * bu iş ayda bir tekrar ediyor.
 */
export async function bulunduguAgiEkle(
  _prev: MesaiFormState,
  formData: FormData,
): Promise<MesaiFormState> {
  const businessId = metin(formData, "businessId");
  const actor = await yetkiliMi(businessId);
  if (!actor) return { error: "Bu işletmeye yetkiniz yok." };

  const ip = istemciIp(await headers());
  if (!ip || ip === "guvenilmez") {
    return {
      error:
        "Bağlantının kaynağı tespit edilemiyor. Sunucu Vercel dışındaysa " +
        "GUVENILIR_IP_BASLIGI tanımlanmalı (bkz. .env.example).",
    };
  }

  const isletme = await prisma.business.findUnique({
    where: { id: businessId },
    select: { mesaiIpleri: true },
  });
  const mevcut = ipleriCoz(isletme?.mesaiIpleri);
  if (mevcut.includes(ip.toLowerCase())) {
    return { saved: `Bu ağ (${ip}) zaten kayıtlı.` };
  }

  await prisma.business.update({
    where: { id: businessId },
    data: { mesaiIpleri: ipleriYaz([...mevcut, ip]) },
  });

  await denetimYaz(actor, "mesai.ip", {
    entity: "business",
    entityId: businessId,
    detail: `Mesai IP eklendi: ${ip}`,
  });

  revalidatePath(YOL);
  return { saved: `${ip} eklendi. Personel bu ağdan giriş yapabilir.` };
}

/** Elle IP listesi düzenleme — blok yazmak isteyen için ("85.105.11."). */
export async function ipleriKaydet(
  _prev: MesaiFormState,
  formData: FormData,
): Promise<MesaiFormState> {
  const businessId = metin(formData, "businessId");
  const actor = await yetkiliMi(businessId);
  if (!actor) return { error: "Bu işletmeye yetkiniz yok." };

  const ipler = ipleriCoz(metin(formData, "ipler"));
  // Üst sınır: her okutmada liste baştan sona taranıyor ve sınırsız bir
  // liste, tek satırlık bir ayarla sorguyu ağırlaştırmanın yolu olurdu.
  if (ipler.length > 20) return { error: "En fazla 20 adres/blok tanımlanabilir." };

  await prisma.business.update({
    where: { id: businessId },
    data: { mesaiIpleri: ipleriYaz(ipler) },
  });

  await denetimYaz(actor, "mesai.ip", {
    entity: "business",
    entityId: businessId,
    detail: `Mesai IP listesi güncellendi (${ipler.length} kayıt)`,
  });

  revalidatePath(YOL);
  return { saved: "Adres listesi kaydedildi." };
}

/**
 * PERSONELİN OKUTMASI — giriş ya da çıkış.
 *
 * Kararı saf fonksiyon veriyor (bkz. lib/personel/mesai.ts): açık kayıt
 * yoksa giriş, varsa çıkış. Burada yalnızca veritabanı işi ve IP'nin
 * okunması var.
 *
 * Bu eylem `requireMesaiErisim` KULLANMIYOR: okutan kişi garson ve
 * garsonun modül izni hiç olmuyor (modüller yalnızca yönetim rollerine
 * dağıtılıyor). Kapı, işletmenin modülü — kullanıcının değil.
 */
export async function mesaiOkut(
  _prev: MesaiFormState,
  formData: FormData,
): Promise<MesaiFormState> {
  const actor = await requireYazma();
  const token = metin(formData, "token");
  if (!token) return { error: "Kod okunamadı." };

  const isletme = await prisma.business.findFirst({
    where: { mesaiQrToken: token },
    select: {
      id: true,
      name: true,
      mesaiIpleri: true,
      account: { select: { users: { where: { role: "owner" }, select: { moduller: true } } } },
    },
  });
  if (!isletme) return { error: "Bu kod geçersiz." };

  // Modül hesabın sahibinde duruyor (bkz. lib/kimlik/moduller.ts).
  const modulVar = isletme.account.users.some((u) => u.moduller.includes("mesai"));
  if (!modulVar) return { error: "Bu işletmede mesai takibi kullanılmıyor." };

  // Kişi gerçekten bu işletmenin personeli mi? Aksi halde başka bir
  // kiracının QR'ını okutan biri o işletmenin tablosunda belirirdi.
  if (!(await canAccessBusiness(actor, isletme.id))) {
    return { error: "Bu işletmenin personeli değilsiniz." };
  }

  const acik = await prisma.mesaiKaydi.findFirst({
    where: { userId: actor.id, cikis: null },
    select: { id: true, userId: true, giris: true, cikis: true },
  });

  const ip = istemciIp(await headers());
  const karar = okutmaKarari({
    izinliIpler: ipleriCoz(isletme.mesaiIpleri),
    ip,
    acikKayit: acik,
  });

  if (karar.sonuc === "red") return { error: karar.mesaj };

  const karma = ipOzeti(ip);

  if (karar.sonuc === "giris") {
    try {
      await prisma.mesaiKaydi.create({
        data: { businessId: isletme.id, userId: actor.id, giris: new Date(), girisIpKarmasi: karma },
      });
    } catch {
      /**
       * Kısmi tekil indeks (mesai_tek_acik_kayit) iki cihazdan aynı anda
       * okutmayı veritabanında durduruyor. Kullanıcıya hata değil,
       * olanı söylüyoruz: girişi zaten açılmış.
       */
      return { saved: "Girişiniz zaten açık." };
    }
    revalidatePath(YOL);
    return { saved: `Giriş alındı — ${isletme.name}.` };
  }

  await prisma.mesaiKaydi.update({
    where: { id: karar.kayitId },
    data: { cikis: new Date(), cikisIpKarmasi: karma, cikisKaynak: "qr" },
  });
  revalidatePath(YOL);
  return { saved: `Çıkış alındı. Bugünkü mesainiz: ${sureMetni(karar.calisilanDakika)}.` };
}

/**
 * Yöneticinin elle düzeltmesi — eksik çıkış ya da yanlış saat.
 *
 * Otomatik kapatma bilerek YOK: bordroya giden bir sayıyı sistemin
 * uydurması, yanlış olduğunda kimsenin fark etmediği türden bir hata.
 * Düzeltme iz bırakıyor (`duzeltenId`, `duzeltmeNotu`) ve denetim
 * kaydına düşüyor.
 */
export async function kaydiDuzelt(
  _prev: MesaiFormState,
  formData: FormData,
): Promise<MesaiFormState> {
  const businessId = metin(formData, "businessId");
  const actor = await yetkiliMi(businessId);
  if (!actor) return { error: "Bu işletmeye yetkiniz yok." };

  const kayitId = metin(formData, "kayitId");
  const kayit = await prisma.mesaiKaydi.findFirst({
    where: { id: kayitId, businessId },
    select: { id: true, user: { select: { name: true } } },
  });
  if (!kayit) return { error: "Kayıt bulunamadı." };

  const giris = new Date(metin(formData, "giris"));
  const cikisHam = metin(formData, "cikis");
  const cikis = cikisHam ? new Date(cikisHam) : null;

  const gecerli = duzeltmeGecerliMi(giris, cikis);
  if (!gecerli.ok) return { error: gecerli.hata };

  await prisma.mesaiKaydi.update({
    where: { id: kayit.id },
    data: {
      giris,
      cikis,
      cikisKaynak: cikis ? "elle" : null,
      duzeltenId: actor.id,
      duzeltmeNotu: metin(formData, "not").slice(0, 200) || null,
    },
  });

  await denetimYaz(actor, "mesai.duzelt", {
    entity: "business",
    entityId: businessId,
    detail: `${kayit.user.name} mesai kaydı elle düzeltildi`,
  });

  revalidatePath(YOL);
  return { saved: "Kayıt düzeltildi." };
}

/** Hiç okutmamış personel için elle kayıt açma. */
export async function elleKayitEkle(
  _prev: MesaiFormState,
  formData: FormData,
): Promise<MesaiFormState> {
  const businessId = metin(formData, "businessId");
  const actor = await yetkiliMi(businessId);
  if (!actor) return { error: "Bu işletmeye yetkiniz yok." };

  const userId = metin(formData, "userId");
  const personel = await prisma.user.findFirst({
    where: { id: userId, OR: [{ businessId }, { businesses: { some: { businessId } } }] },
    select: { id: true, name: true },
  });
  if (!personel) return { error: "Personel bu işletmede bulunamadı." };

  const giris = new Date(metin(formData, "giris"));
  const cikisHam = metin(formData, "cikis");
  const cikis = cikisHam ? new Date(cikisHam) : null;

  const gecerli = duzeltmeGecerliMi(giris, cikis);
  if (!gecerli.ok) return { error: gecerli.hata };

  try {
    await prisma.mesaiKaydi.create({
      data: {
        businessId,
        userId: personel.id,
        giris,
        cikis,
        girisKaynak: "elle",
        cikisKaynak: cikis ? "elle" : null,
        duzeltenId: actor.id,
        duzeltmeNotu: metin(formData, "not").slice(0, 200) || null,
      },
    });
  } catch {
    return { error: "Bu personelin açık bir kaydı zaten var; önce onu kapatın." };
  }

  await denetimYaz(actor, "mesai.duzelt", {
    entity: "business",
    entityId: businessId,
    detail: `${personel.name} için elle mesai kaydı eklendi`,
  });

  revalidatePath(YOL);
  return { saved: `${personel.name} için kayıt eklendi.` };
}
