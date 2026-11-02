import "dotenv/config";
import { randomBytes } from "crypto";
import { createScriptClient } from "./prisma-client";
import { SADAKAT_ESIGI } from "../src/lib/biyerlere/sadakat";
import { ROZETLER, hakEdilenRozetler, type ZiyaretOzeti } from "../src/lib/biyerlere/rozet";
import { ZIYARET_PUANI } from "../src/lib/biyerlere/ziyaret";

/**
 * Demo verisindeki ÜÇ BOŞLUĞU kapatır.
 *
 *   npm run demo:tamamla
 *
 * demo-biyerlere.ts işletmeleri ve tüketicileri kuruyor ama üç ekran
 * boş kalıyordu ve bu ancak uygulamayı gezerken fark ediliyor:
 *
 *   1. Rotalar sekmesi     — hiç rota yoktu (sistem tam, içerik yok)
 *   2. Cüzdan'daki kuponlar — kimse sadakat eşiğini (10 ziyaret)
 *                            geçmediği için hiç kupon oluşmamıştı
 *   3. Mekan detayı        — 56 işletmenin 34'ünde menü yoktu, "Öne
 *                            çıkan lezzetler" boş görünüyordu
 *
 * Idempotent: var olanı yeniden üretmiyor, yalnızca eksiği tamamlıyor.
 */

const URUN_HAVUZU = [
  { ad: "Filtre Kahve", fiyat: 12000 },
  { ad: "Türk Kahvesi", fiyat: 9000 },
  { ad: "Flat White", fiyat: 14000 },
  { ad: "Cheesecake", fiyat: 18000 },
  { ad: "Avokadolu Tost", fiyat: 22000 },
  { ad: "Karışık Izgara", fiyat: 45000 },
  { ad: "Levrek Izgara", fiyat: 55000 },
  { ad: "Midye Dolma (10 adet)", fiyat: 15000 },
  { ad: "Mevsim Salata", fiyat: 19000 },
  { ad: "Limonata", fiyat: 8500 },
  { ad: "Kokoreç Yarım Ekmek", fiyat: 13000 },
  { ad: "Adana Kebap", fiyat: 32000 },
  { ad: "Sahlep", fiyat: 11000 },
  { ad: "Mercimek Çorbası", fiyat: 12000 },
];

const KATEGORI_ADLARI = ["Kahveler", "Tatlılar", "Ana Yemekler", "Atıştırmalıklar", "Soğuk İçecekler"];

/** Rota şablonları — duraklar semt/tür eşleşmesine göre seçiliyor. */
const ROTA_SABLONLARI = [
  {
    slug: "bogaz-kahve-turu",
    ad: "Boğaz Kahve Turu",
    aciklama: "Boğaz hattında üç durak: sabah kahvesi, öğleden sonra manzara, akşam serinliği.",
    eslesme: (ad: string) => /bebek|ortaköy|arnavutköy|kuruçeşme|bosphorus/i.test(ad),
    tur: "yeme_icme",
  },
  {
    slug: "kadikoy-klasikleri",
    ad: "Kadıköy Klasikleri",
    aciklama: "Moda'dan Fenerbahçe'ye, yakanın en çok gidilen üç mekanı.",
    eslesme: (ad: string) => /moda|kadıköy|kuşdili|yeldeğirmeni|fenerbahçe|suadiye|caddebostan/i.test(ad),
    tur: "yeme_icme",
  },
  {
    slug: "balik-hatti",
    ad: "Balık Hattı",
    aciklama: "Kumkapı'dan Anadolu Kavağı'na — şehrin balıkçı durakları.",
    eslesme: () => true,
    tur: "balikci",
  },
];

function rasgele<T>(liste: T[]): T {
  return liste[Math.floor(Math.random() * liste.length)];
}
function aralikta(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function birkaci<T>(liste: T[], adet: number): T[] {
  const kopya = [...liste];
  const sonuc: T[] = [];
  for (let i = 0; i < adet && kopya.length > 0; i++) {
    sonuc.push(kopya.splice(Math.floor(Math.random() * kopya.length), 1)[0]);
  }
  return sonuc;
}

async function main() {
  const prisma = createScriptClient();

  try {
    // --- 1) Menüsüz işletmelere menü ---------------------------------
    const menusuzler = await prisma.business.findMany({
      where: { menuItems: { none: {} } },
      select: { id: true, name: true, type: true },
    });

    let menuEklenen = 0;
    for (const biz of menusuzler) {
      const kategori = await prisma.menuCategory.create({
        data: { businessId: biz.id, name: rasgele(KATEGORI_ADLARI), sortOrder: 1 },
      });
      // Balıkçıda deniz ürünü ağırlıklı olsun — menü mekanla tutarlı görünsün.
      const havuz =
        biz.type === "balikci"
          ? URUN_HAVUZU.filter((u) => /levrek|midye|salata|çorba|limonata/i.test(u.ad))
          : URUN_HAVUZU;
      for (const [sira, urun] of birkaci(havuz, aralikta(3, 5)).entries()) {
        await prisma.menuItem.create({
          data: {
            businessId: biz.id,
            categoryId: kategori.id,
            name: urun.ad,
            priceKurus: urun.fiyat,
            sortOrder: sira,
          },
        });
      }
      menuEklenen += 1;
    }
    console.log(`${menuEklenen} işletmeye menü eklendi.`);

    // --- 2) Rotalar ---------------------------------------------------
    const kesfedilebilir = await prisma.business.findMany({
      where: { latitude: { not: null } },
      select: { id: true, name: true, type: true },
    });

    let rotaEklenen = 0;
    for (const sablon of ROTA_SABLONLARI) {
      const mevcut = await prisma.rota.findUnique({ where: { slug: sablon.slug } });
      if (mevcut) continue;

      const adaylar = kesfedilebilir.filter(
        (b) => b.type === sablon.tur && sablon.eslesme(b.name),
      );
      // Rota en az üç duraklı olmalı: iki duraklı "rota" bir liste bile değil.
      const duraklar = birkaci(adaylar, Math.min(4, adaylar.length));
      if (duraklar.length < 3) continue;

      await prisma.rota.create({
        data: {
          slug: sablon.slug,
          ad: sablon.ad,
          aciklama: sablon.aciklama,
          duraklar: {
            create: duraklar.map((d, sira) => ({ businessId: d.id, sira })),
          },
        },
      });
      rotaEklenen += 1;
    }
    console.log(`${rotaEklenen} rota oluşturuldu.`);

    // --- 3) Sadakat kuponu --------------------------------------------
    // Kupon, eşiği (10 ziyaret) geçen kullanıcıya veriliyor. Hiç kimse
    // geçmediği için Cüzdan'daki "Aktif kuponlar" bölümü hep boştu.
    const aday = await prisma.appUser.findFirst({
      where: { ziyaretler: { some: {} } },
      select: {
        id: true,
        name: true,
        ziyaretler: { select: { businessId: true } },
      },
    });

    let kuponEklenen = 0;
    if (aday) {
      // En çok gittiği mekanı bul, eşiği dolduracak kadar ziyaret ekle.
      const sayac = new Map<string, number>();
      for (const z of aday.ziyaretler) sayac.set(z.businessId, (sayac.get(z.businessId) ?? 0) + 1);
      const [enCokBizId, mevcutSayi] = [...sayac.entries()].sort((a, b) => b[1] - a[1])[0];

      const eksik = SADAKAT_ESIGI - mevcutSayi;
      if (eksik > 0) {
        for (let i = 0; i < eksik; i++) {
          await prisma.appVisit.create({
            data: {
              appUserId: aday.id,
              businessId: enCokBizId,
              mesafeMetre: aralikta(5, 90),
              createdAt: new Date(Date.now() - aralikta(1, 90) * 24 * 60 * 60 * 1000),
            },
          });
        }
      }

      const mevcutKupon = await prisma.coupon.findFirst({
        where: { appUserId: aday.id, businessId: enCokBizId, used: false },
      });
      if (!mevcutKupon) {
        await prisma.coupon.create({
          data: {
            businessId: enCokBizId,
            appUserId: aday.id,
            code: `SADAKAT-${randomBytes(4).toString("hex").toUpperCase()}`,
            discount: "Ücretsiz kahve (sadakat ödülü)",
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
        kuponEklenen += 1;
      }

      // Ziyaret eklendiyse puan ve rozetler yeniden hesaplanmalı; aksi
      // halde 10 ziyareti olup 200 puan gösteren tutarsız profil çıkar
      // (bkz. scripts/puan-onar.ts'in çözdüğü sorunun aynısı).
      const guncel = await prisma.appUser.findUniqueOrThrow({
        where: { id: aday.id },
        select: {
          referredById: true,
          rozetler: { select: { rozet: true } },
          ziyaretler: { select: { businessId: true } },
          _count: { select: { davetEttikleri: true } },
        },
      });
      const yeniSayac = new Map<string, number>();
      for (const z of guncel.ziyaretler) yeniSayac.set(z.businessId, (yeniSayac.get(z.businessId) ?? 0) + 1);
      const canliMuzikli = await prisma.business.count({
        where: { id: { in: [...yeniSayac.keys()] }, mekanOzellikleri: { contains: "canliMuzik" } },
      });
      const ozet: ZiyaretOzeti = {
        toplamZiyaret: guncel.ziyaretler.length,
        farkliMekan: yeniSayac.size,
        canliMuzikMekani: canliMuzikli,
        enCokZiyaretEdilenMekan: Math.max(...yeniSayac.values()),
      };
      const hakEdilen = hakEdilenRozetler(ozet);
      const mevcutRozetler = new Set(guncel.rozetler.map((r) => r.rozet));
      for (const rozet of hakEdilen) {
        if (!mevcutRozetler.has(rozet)) {
          await prisma.appBadge.create({ data: { appUserId: aday.id, rozet } });
        }
      }
      const rozetPuani = hakEdilen.reduce((t, r) => t + ROZETLER[r].puan, 0);
      const davetPuani = guncel._count.davetEttikleri * 100 + (guncel.referredById ? 100 : 0);
      await prisma.appUser.update({
        where: { id: aday.id },
        data: { puan: guncel.ziyaretler.length * ZIYARET_PUANI + rozetPuani + davetPuani },
      });

      console.log(
        `${kuponEklenen} sadakat kuponu oluşturuldu (${aday.name}, ${guncel.ziyaretler.length} ziyaret).`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
