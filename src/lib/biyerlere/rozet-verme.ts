import "server-only";
import { prisma } from "../cekirdek/db";
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
 * EŞZAMANLILIK: `createMany` + `skipDuplicates` tek başına YETMİYORDU ve
 * bu kod uzun süre öyle duruyordu. Tekillik kısıtı rozet SATIRINI
 * koruyor ama puan artışını korumuyor:
 *
 *   İki istek aynı anda "kahveGurmesi hak edildi" diye hesaplıyor.
 *   A rozeti yazıyor, +150 puan.
 *   B'nin yazımı atlanıyor (duplicate) ama +150 puan YİNE ekleniyor.
 *   Sonuç: 1 rozet, 300 puan.
 *
 * Ölçüldü ve doğrulandı: iki ardışık çağrı 50 puanlık bir rozet için 100
 * puan üretti. Koddaki eski yorum "tekillik kısıtı bunu zaten engelliyor"
 * diyordu — engellediği rozetti, puan değil.
 *
 * Artık mevcut rozetler İŞLEMİN İÇİNDE tekrar okunuyor ve puan yalnızca
 * GERÇEKTEN eklenen rozetler için veriliyor. Serializable izolasyon,
 * iki işlemin aynı anda "bu rozet yok" görmesini engelliyor
 * (bkz. api/app/ziyaret/route.ts — aynı sınıf hata, aynı çözüm).
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

  const { eklenenler, toplamPuan } = await prisma.$transaction(
    async (tx) => {
      // Rozetler İŞLEMİN İÇİNDE yeniden okunuyor: dışarıdaki okuma ile bu
      // an arasında başka bir istek aynı rozeti yazmış olabilir.
      const simdikiler = new Set(
        (
          await tx.appBadge.findMany({
            where: { appUserId },
            select: { rozet: true },
          })
        ).map((r) => r.rozet),
      );

      const gercektenYeni = yeniler.filter((r) => !simdikiler.has(r));
      if (gercektenYeni.length === 0) {
        const mevcutKullanici = await tx.appUser.findUnique({
          where: { id: appUserId },
          select: { puan: true },
        });
        return { eklenenler: [] as RozetAnahtari[], toplamPuan: mevcutKullanici?.puan ?? 0 };
      }

      await tx.appBadge.createMany({
        data: gercektenYeni.map((rozet) => ({ appUserId, rozet })),
      });

      // Puan YALNIZCA gerçekten eklenen rozetler için.
      const kullanici = await tx.appUser.update({
        where: { id: appUserId },
        data: {
          puan: {
            increment: gercektenYeni.reduce((t, r) => t + ROZETLER[r].puan, 0),
          },
        },
        select: { puan: true },
      });

      return { eklenenler: gercektenYeni, toplamPuan: kullanici.puan };
    },
    { isolationLevel: "Serializable" },
  );

  return {
    yeniRozetler: eklenenler.map((anahtar) => ({
      anahtar,
      ad: ROZETLER[anahtar].ad,
      aciklama: ROZETLER[anahtar].aciklama,
      puan: ROZETLER[anahtar].puan,
    })),
    toplamPuan,
  };
}
