import "server-only";

import { prisma } from "@/lib/cekirdek/db";
import { KRITIK_GUN } from "@/lib/isletme/abonelik";
import {
  DURUM_METNI,
  ZAMANLI_ISLER,
  isSagligi,
  isSorunluMu,
  yedeklemeYonetiliyorMu,
  type IsDurumu,
} from "@/lib/altyapi/isler";

/**
 * Platform yöneticisinin "bugün neye bakmalıyım" listesi.
 *
 * Üç ekran aynı soruyu soruyor — zil rozeti, Özet sayfası, Sistem
 * sağlığı — ve her biri sayıyı kendi sorgusuyla hesaplasaydı, zil "3"
 * derken Özet "2" diyebilirdi. Kaynak tek.
 */
export type PlatformUyarisi = {
  anahtar: string;
  ciddiyet: "hata" | "uyari";
  baslik: string;
  aciklama: string;
  href: string;
};

export type IsSatiri = {
  ad: string;
  etiket: string;
  aciklama: string;
  komut: string;
  beklenenSaat: number;
  durum: IsDurumu;
  sonCalisma: Date | null;
  sonHata: string | null;
};

const GUN_MS = 24 * 60 * 60 * 1000;

/** Zamanlanmış işlerin ekrandaki hâli (yönetilen yedekleme dahil). */
export async function isSatirlari(simdi = new Date()): Promise<IsSatiri[]> {
  const yonetiliyor = yedeklemeYonetiliyorMu(process.env.DATABASE_URL);
  const sonlar = await Promise.all(
    ZAMANLI_ISLER.map((is) =>
      prisma.jobRun.findFirst({ where: { name: is.ad }, orderBy: { startedAt: "desc" } }),
    ),
  );
  return ZAMANLI_ISLER.map((is, i) => {
    const son = sonlar[i];
    return {
      ...is,
      durum: isSagligi(is, son, { yedeklemeYonetiliyor: yonetiliyor }, simdi),
      sonCalisma: son?.finishedAt ?? null,
      sonHata: son && !son.ok ? son.detail : null,
    };
  });
}

export async function platformUyarilari(simdi = new Date()): Promise<PlatformUyarisi[]> {
  const kritikSinir = new Date(simdi.getTime() + KRITIK_GUN * GUN_MS);

  const [isler, dolmus, kritik, sahipsiz] = await Promise.all([
    isSatirlari(simdi),
    prisma.account.count({ where: { active: true, expiresAt: { lte: simdi } } }),
    prisma.account.count({
      where: { active: true, expiresAt: { gt: simdi, lte: kritikSinir } },
    }),
    // Sahibi olmayan hesaba kimse giremez; açılışta unutulmuş bir adım.
    prisma.account.count({
      where: { active: true, users: { none: { role: "owner", active: true } } },
    }),
  ]);

  const uyarilar: PlatformUyarisi[] = [];
  for (const is of isler.filter((i) => isSorunluMu(i.durum))) {
    uyarilar.push({
      anahtar: `is:${is.ad}`,
      ciddiyet: "hata",
      baslik: `${is.etiket}: ${DURUM_METNI[is.durum].toLocaleLowerCase("tr")}`,
      aciklama: is.aciklama,
      href: "/admin/sistem",
    });
  }
  if (dolmus > 0) {
    uyarilar.push({
      anahtar: "abonelik:dolmus",
      ciddiyet: "hata",
      baslik: `${dolmus} hesabın aboneliği doldu`,
      aciklama: "Bu hesapların QR'ları çalışmıyor; panel salt okunur.",
      href: "/admin/abonelikler?sekme=dolmus",
    });
  }
  if (kritik > 0) {
    uyarilar.push({
      anahtar: "abonelik:kritik",
      ciddiyet: "uyari",
      baslik: `${kritik} abonelik ${KRITIK_GUN} gün içinde bitiyor`,
      aciklama: "Ödeme hatırlatması için en uygun zaman.",
      href: "/admin/abonelikler?sekme=kritik",
    });
  }
  if (sahipsiz > 0) {
    uyarilar.push({
      anahtar: "hesap:sahipsiz",
      ciddiyet: "uyari",
      baslik: `${sahipsiz} hesabın aktif sahibi yok`,
      aciklama: "Bu hesaplara kimse giriş yapamaz.",
      href: "/admin/hesaplar?durum=sahipsiz",
    });
  }
  return uyarilar;
}
