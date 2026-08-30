import "server-only";
import { prisma } from "./db";
import { ozellikleriCoz } from "./mekan";
import {
  ROZETLER,
  yeniRozetler,
  type RozetAnahtari,
  type ZiyaretOzeti,
} from "./rozet";

/**
 * Ziyaret sonrası rozet değerlendirmesi.
 *
 * Kurallar lib/rozet.ts'te saf; burası yalnızca veritabanından özeti
 * çıkarıp sonucu yazıyor. Ayrımın sebebi test edilebilirlik: "5 farklı
 * mekan = Kahve Gurmesi" kuralını sınamak için elli sahte ziyaret kaydı
 * kurmak gerekmesin.
 */

/** Kullanıcının ziyaret geçmişinden rozet özeti çıkarır. */
export async function ziyaretOzetiCikar(appUserId: string): Promise<ZiyaretOzeti> {
  const ziyaretler = await prisma.appVisit.findMany({
    where: { appUserId },
    select: {
      businessId: true,
      business: { select: { mekanOzellikleri: true } },
    },
  });

  const mekanSayaci = new Map<string, number>();
  const canliMuzik = new Set<string>();

  for (const z of ziyaretler) {
    mekanSayaci.set(z.businessId, (mekanSayaci.get(z.businessId) ?? 0) + 1);
    if (ozellikleriCoz(z.business.mekanOzellikleri).includes("canliMuzik")) {
      canliMuzik.add(z.businessId);
    }
  }

  return {
    toplamZiyaret: ziyaretler.length,
    farkliMekan: mekanSayaci.size,
    canliMuzikMekani: canliMuzik.size,
    enCokZiyaretEdilenMekan: Math.max(0, ...mekanSayaci.values()),
  };
}

export type KazanilanRozet = {
  anahtar: RozetAnahtari;
  ad: string;
  aciklama: string;
  puan: number;
};

/**
 * Hak edilen yeni rozetleri verir ve puanlarını ekler.
 *
 * Yeni rozet yoksa hiçbir yazma yapılmıyor: her ziyarette gereksiz bir
 * güncelleme turu atmanın anlamı yok.
 *
 * `createMany` + `skipDuplicates`: iki istek aynı anda gelirse (kullanıcı
 * iki kez dokundu) aynı rozet iki kez yazılmaya çalışılır; tekillik
 * kısıtı bunu zaten engelliyor ama hata fırlatmak yerine sessizce
 * atlamak doğru davranış.
 */
export async function rozetleriDegerlendir(
  appUserId: string,
): Promise<{ yeniRozetler: KazanilanRozet[]; toplamPuan: number }> {
  const [ozet, mevcut] = await Promise.all([
    ziyaretOzetiCikar(appUserId),
    prisma.appBadge.findMany({ where: { appUserId }, select: { rozet: true } }),
  ]);

  const yeniler = yeniRozetler(
    ozet,
    mevcut.map((r) => r.rozet),
  );

  if (yeniler.length === 0) {
    const kullanici = await prisma.appUser.findUnique({
      where: { id: appUserId },
      select: { puan: true },
    });
    return { yeniRozetler: [], toplamPuan: kullanici?.puan ?? 0 };
  }

  const ekPuan = yeniler.reduce((t, r) => t + ROZETLER[r].puan, 0);

  const [, kullanici] = await prisma.$transaction([
    prisma.appBadge.createMany({
      data: yeniler.map((rozet) => ({ appUserId, rozet })),
      skipDuplicates: true,
    }),
    prisma.appUser.update({
      where: { id: appUserId },
      data: { puan: { increment: ekPuan } },
      select: { puan: true },
    }),
  ]);

  return {
    yeniRozetler: yeniler.map((anahtar) => ({
      anahtar,
      ad: ROZETLER[anahtar].ad,
      aciklama: ROZETLER[anahtar].aciklama,
      puan: ROZETLER[anahtar].puan,
    })),
    toplamPuan: kullanici.puan,
  };
}
