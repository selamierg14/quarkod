import "server-only";
import { prisma } from "./db";

/**
 * Bir rotayı tamamlamanın (tüm duraklarda doğrulanmış ziyaret) kazandırdığı
 * bonus puan.
 *
 * Tek bir ziyaretten (ZIYARET_PUANI=50) belirgin şekilde büyük: bir rota
 * genelde 3-5 farklı mekanı gerektiriyor, ödül o çabayı yansıtmalı. Rozet
 * ödüllerine (150-300 arası, bkz. lib/rozet.ts) yakın bir aralıkta —
 * "kahve pasaportunu" tamamlamak bir rozet kazanmak kadar değerli
 * hissettirmeli.
 */
export const ROTA_TAMAMLAMA_PUANI = 250;

export type TamamlananRota = { id: string; ad: string; slug: string };

/**
 * Az önce ziyaret edilen mekanı durak olarak içeren rotaları değerlendirir;
 * kullanıcı tüm duraklarını doğrulanmış ziyaretle tamamlamışsa ve daha
 * önce tamamlamamışsa puan verir ve `RotaTamamlama` kaydını açar.
 *
 * Yalnızca bu mekanı içeren rotalara bakmak yeterli: kullanıcı BAŞKA bir
 * rotayı bu ziyaretle tamamlamış olamaz, o rotanın durakları arasında bu
 * mekan yoksa bu ziyaret onun eksik durağını kapatmaz.
 */
export async function rotalariDegerlendir(
  appUserId: string,
  ziyaretEdilenBusinessId: string,
): Promise<TamamlananRota[]> {
  const adaylar = await prisma.rota.findMany({
    where: { aktif: true, duraklar: { some: { businessId: ziyaretEdilenBusinessId } } },
    select: {
      id: true,
      ad: true,
      slug: true,
      duraklar: { select: { businessId: true } },
      tamamlamalar: { where: { appUserId }, select: { id: true } },
    },
  });

  const degerlendirilecek = adaylar.filter((rota) => rota.tamamlamalar.length === 0);
  if (degerlendirilecek.length === 0) return [];

  const ziyaretEdilenIsletmeler = new Set(
    (
      await prisma.appVisit.findMany({
        where: { appUserId },
        select: { businessId: true },
        distinct: ["businessId"],
      })
    ).map((v) => v.businessId),
  );

  const tamamlananlar: TamamlananRota[] = [];
  for (const rota of degerlendirilecek) {
    const hepsiZiyaretEdildi = rota.duraklar.every((d) => ziyaretEdilenIsletmeler.has(d.businessId));
    if (!hepsiZiyaretEdildi) continue;

    // Aynı anda iki isteğin aynı rotayı çift tamamlamasına karşı: unique
    // kısıt (rotaId+appUserId) ikinci yazımı P2002 ile reddeder, biz de
    // sessizce yutuyoruz — kullanıcı zaten ilk istekte ödülünü aldı.
    try {
      await prisma.$transaction([
        prisma.rotaTamamlama.create({ data: { rotaId: rota.id, appUserId } }),
        prisma.appUser.update({
          where: { id: appUserId },
          data: { puan: { increment: ROTA_TAMAMLAMA_PUANI } },
        }),
      ]);
      tamamlananlar.push({ id: rota.id, ad: rota.ad, slug: rota.slug });
    } catch (hata) {
      if ((hata as { code?: string }).code !== "P2002") throw hata;
    }
  }

  return tamamlananlar;
}
