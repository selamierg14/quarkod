import "dotenv/config";
import { createScriptClient } from "./prisma-client";
import { ROZETLER, hakEdilenRozetler, type ZiyaretOzeti } from "../src/lib/rozet";
import { ZIYARET_PUANI } from "../src/lib/ziyaret";

/**
 * Tüketici puanlarını GERÇEK ziyaret geçmişinden yeniden hesaplar.
 *
 *   npm run puan:onar
 *
 * Neden gerekti: demo-biyerlere.ts'in ilk sürümü tekrar çalıştırıldığında
 * ziyaretleri üst üste ekliyor ama puanı yalnızca O ÇALIŞTIRMADA ürettiği
 * ziyaret sayısına göre yeniden yazıyordu. Sonuç, 15 ziyareti olup 200
 * puan gösteren tutarsız profillerdi. Script artık geçmişi olan
 * kullanıcıyı atlıyor; bu komut da geride kalan tutarsızlığı temizliyor.
 *
 * Hesap, uygulamanın kendi kurallarını KULLANIYOR (lib/rozet.ts,
 * lib/ziyaret.ts) — burada ayrı bir formül yazmak, ödül mantığı
 * değiştiğinde sessizce yanlış puan üreten ikinci bir kaynak demekti.
 *
 * Yalnızca demo tüketicilerini değil TÜM tüketicileri kapsıyor: gerçek
 * bir kullanıcının puanı da ziyaretlerinden türetilebilir olmalı. Davet
 * ödülü gibi ziyaret DIŞI puan kaynakları korunuyor (bkz. aşağıdaki
 * `davetPuani`) — aksi hâlde arkadaşını davet etmiş birinin puanı
 * onarım sırasında silinirdi.
 */

/** lib/davet.ts ile aynı: davet eden ve edilen 100'er puan alıyor. */
const DAVET_PUANI = 100;

async function main() {
  const prisma = createScriptClient();

  try {
    const kullanicilar = await prisma.appUser.findMany({
      select: {
        id: true,
        name: true,
        puan: true,
        referredById: true,
        rozetler: { select: { rozet: true } },
        ziyaretler: { select: { businessId: true } },
        _count: { select: { davetEttikleri: true } },
      },
    });

    let duzeltilen = 0;

    for (const k of kullanicilar) {
      const ziyaretSayaci = new Map<string, number>();
      for (const z of k.ziyaretler) {
        ziyaretSayaci.set(z.businessId, (ziyaretSayaci.get(z.businessId) ?? 0) + 1);
      }

      // "Gece Kuşu" rozeti canlı müzikli mekan sayısına bakıyor; bu
      // bilgi işletmede duruyor, ziyaret kaydında değil.
      const bizIdler = [...ziyaretSayaci.keys()];
      const canliMuzikli = bizIdler.length
        ? await prisma.business.count({
            where: { id: { in: bizIdler }, mekanOzellikleri: { contains: "canliMuzik" } },
          })
        : 0;

      const ozet: ZiyaretOzeti = {
        toplamZiyaret: k.ziyaretler.length,
        farkliMekan: ziyaretSayaci.size,
        canliMuzikMekani: canliMuzikli,
        enCokZiyaretEdilenMekan: ziyaretSayaci.size
          ? Math.max(...ziyaretSayaci.values())
          : 0,
      };

      const hakEdilen = hakEdilenRozetler(ozet);
      const rozetPuani = hakEdilen.reduce((t, r) => t + ROZETLER[r].puan, 0);
      const davetPuani = k._count.davetEttikleri * DAVET_PUANI + (k.referredById ? DAVET_PUANI : 0);
      const dogruPuan = k.ziyaretler.length * ZIYARET_PUANI + rozetPuani + davetPuani;

      // Eksik rozetleri de tamamla: ziyaret sayısı eşiği geçmişse rozet
      // vitrininde görünmeli.
      const mevcutRozetler = new Set(k.rozetler.map((r) => r.rozet));
      for (const rozet of hakEdilen) {
        if (!mevcutRozetler.has(rozet)) {
          await prisma.appBadge.create({ data: { appUserId: k.id, rozet } });
        }
      }

      if (dogruPuan !== k.puan) {
        await prisma.appUser.update({ where: { id: k.id }, data: { puan: dogruPuan } });
        console.log(`${k.name.padEnd(22)} ${String(k.puan).padStart(5)} → ${dogruPuan}`);
        duzeltilen += 1;
      }
    }

    console.log(`\n${duzeltilen}/${kullanicilar.length} tüketicinin puanı düzeltildi.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
