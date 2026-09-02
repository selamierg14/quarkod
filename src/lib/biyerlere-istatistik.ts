import "server-only";
import { prisma } from "./db";
import { ZIYARET_PUANI, ANKET_KATILIM_PUANI } from "./ziyaret";

export type BiyerlereIstatistik = {
  goruntuleme: number;
  yolTarifi: number;
  kuponKullanildi: number;
  puanVerildi: number;
};

/**
 * Admin panosundaki "Biyerlere bu hafta" kartının ham verisi.
 *
 * Son 7 gün: panonun diğer kartları da aynı pencereyi kullanıyor (bkz.
 * page.tsx'teki `son7`), tutarlı bir "bu hafta" tanımı için.
 *
 * "Puan verildi" yalnızca BU işletmeye doğrudan atfedilebilen puanları
 * sayıyor — doğrulanmış ziyaret (ZIYARET_PUANI) ve masa anketi
 * (ANKET_KATILIM_PUANI). Rozet/rota/davet puanları kasıtlı DIŞARIDA:
 * onlar tek bir işletmeye değil kullanıcının genel Biyerlere geçmişine
 * bağlı, bir işletmenin "bu hafta ne kazandırdı" sorusuna yanlış cevap
 * verirdi.
 */
export async function biyerlereIstatistikGetir(businessIds: string[]): Promise<BiyerlereIstatistik> {
  if (businessIds.length === 0) {
    return { goruntuleme: 0, yolTarifi: 0, kuponKullanildi: 0, puanVerildi: 0 };
  }

  const yediGunOnce = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [etkilesimler, kuponKullanildi, ziyaretSayisi, anketPuanliSayisi] = await Promise.all([
    prisma.mekanEtkilesim.groupBy({
      by: ["tur"],
      where: { businessId: { in: businessIds }, createdAt: { gte: yediGunOnce } },
      _count: true,
    }),
    prisma.coupon.count({
      where: { businessId: { in: businessIds }, used: true, usedAt: { gte: yediGunOnce } },
    }),
    prisma.appVisit.count({
      where: { businessId: { in: businessIds }, createdAt: { gte: yediGunOnce } },
    }),
    prisma.feedback.count({
      where: {
        businessId: { in: businessIds },
        appUserId: { not: null },
        createdAt: { gte: yediGunOnce },
      },
    }),
  ]);

  const goruntuleme = etkilesimler.find((e) => e.tur === "goruntuleme")?._count ?? 0;
  const yolTarifi = etkilesimler.find((e) => e.tur === "yolTarifi")?._count ?? 0;

  return {
    goruntuleme,
    yolTarifi,
    kuponKullanildi,
    puanVerildi: ziyaretSayisi * ZIYARET_PUANI + anketPuanliSayisi * ANKET_KATILIM_PUANI,
  };
}
