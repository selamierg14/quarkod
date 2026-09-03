import "dotenv/config";
import bcrypt from "bcryptjs";
import { createScriptClient } from "./prisma-client";
import { davetKoduUret } from "../src/lib/davet";
import { hakEdilenRozetler, type ZiyaretOzeti } from "../src/lib/rozet";

/**
 * Biyerlere'yi (Keşfet/Harita/Cüzdan) "yüzlerce kullanıcısı olan canlı bir
 * uygulama" gibi göstermek için gerçekçi, kalıcı işletme + tüketici verisi
 * üretir.
 *
 *   npm run demo:biyerlere
 *
 * Idempotent: her işletme/tüketici sabit bir username/slug'a `upsert`
 * edilir — script tekrar çalıştırılırsa yinelenmiş kayıt oluşmaz, yalnızca
 * güncellenir. Bu yüzden `db:reset` gerektiren diğer demo script'lerinden
 * (demo-veri.ts, demo-kullanicilar.ts) farklı olarak burada bir "[DEMO]"
 * uyarısı YOK: bu veri kasıtlı olarak KALICI ve gerçek Keşfet/Harita'da
 * görünmesi isteniyor (bkz. ilgili konuşma).
 */

const SIFRE = "Bi" + Math.random().toString(36).slice(2, 10) + "!" + Math.random().toString(36).slice(2, 6);

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

function slugla(ad: string): string {
  const harita: Record<string, string> = {
    ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u",
    Ç: "c", Ğ: "g", İ: "i", Ö: "o", Ş: "s", Ü: "u",
  };
  return ad
    .split("")
    .map((h) => harita[h] ?? h)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type Tur = "yeme_icme" | "balikci" | "gece_kulubu";

const ISLETMELER: { ad: string; tur: Tur; lat: number; lng: number }[] = [
  // --- Kadıköy / Moda / Fenerbahçe / Caddebostan
  { ad: "Moda Sahil Cafe", tur: "yeme_icme", lat: 40.9827, lng: 29.028 },
  { ad: "Kuşdili Kahvecisi", tur: "yeme_icme", lat: 40.9887, lng: 29.0301 },
  { ad: "Yeldeğirmeni Kahve", tur: "yeme_icme", lat: 40.9938, lng: 29.0246 },
  { ad: "Fenerbahçe Sahil Kahve", tur: "yeme_icme", lat: 40.9701, lng: 29.0429 },
  { ad: "Caddebostan Deniz Restoran", tur: "yeme_icme", lat: 40.967, lng: 29.058 },
  { ad: "Suadiye Cafe", tur: "yeme_icme", lat: 40.9635, lng: 29.0725 },
  { ad: "Kadıköy Meyhanesi", tur: "balikci", lat: 40.9905, lng: 29.0277 },
  // --- Beşiktaş / Ortaköy / Bebek / Arnavutköy / Kuruçeşme
  { ad: "Beşiktaş Çay Bahçesi", tur: "yeme_icme", lat: 41.0422, lng: 29.0061 },
  { ad: "Ortaköy Kumpir Durağı", tur: "yeme_icme", lat: 41.0553, lng: 29.027 },
  { ad: "Bebek Cafe", tur: "yeme_icme", lat: 41.077, lng: 29.043 },
  { ad: "Arnavutköy Balık Evi", tur: "balikci", lat: 41.068, lng: 29.043 },
  { ad: "Bebek Gece Kulübü", tur: "gece_kulubu", lat: 41.0775, lng: 29.0435 },
  { ad: "Kuruçeşme Club", tur: "gece_kulubu", lat: 41.0653, lng: 29.0388 },
  { ad: "Ortaköy Sunset Bar", tur: "gece_kulubu", lat: 41.0558, lng: 29.0275 },
  // --- Karaköy / Beyoğlu / Cihangir / Taksim / Galata
  { ad: "Karaköy Lokantası", tur: "yeme_icme", lat: 41.0256, lng: 28.9744 },
  { ad: "Galata Cafe", tur: "yeme_icme", lat: 41.0256, lng: 28.9741 },
  { ad: "Cihangir Kitap Kahve", tur: "yeme_icme", lat: 41.0328, lng: 28.9838 },
  { ad: "Karaköy Balıkçısı", tur: "balikci", lat: 41.0245, lng: 28.9735 },
  { ad: "Beyoğlu Roof Bar", tur: "gece_kulubu", lat: 41.037, lng: 28.977 },
  { ad: "Karaköy Jazz Bar", tur: "gece_kulubu", lat: 41.0248, lng: 28.9748 },
  { ad: "Taksim Meydan Kahvesi", tur: "yeme_icme", lat: 41.037, lng: 28.9857 },
  // --- Nişantaşı / Şişli / Etiler / Levent / Maçka / Bomonti
  { ad: "Nişantaşı Patisserie", tur: "yeme_icme", lat: 41.048, lng: 28.993 },
  { ad: "Nişantaşı Lounge", tur: "gece_kulubu", lat: 41.0483, lng: 28.9933 },
  { ad: "Levent Business Cafe", tur: "yeme_icme", lat: 41.0814, lng: 29.013 },
  { ad: "Levent Sky Bar", tur: "gece_kulubu", lat: 41.0818, lng: 29.0135 },
  { ad: "Etiler Brunch Evi", tur: "yeme_icme", lat: 41.0797, lng: 29.033 },
  { ad: "Maçka Park Cafe", tur: "yeme_icme", lat: 41.0448, lng: 28.9925 },
  { ad: "Bomonti Craft Coffee", tur: "yeme_icme", lat: 41.0577, lng: 28.98 },
  // --- Üsküdar / Kuzguncuk / Beykoz / Sarıyer / Yeniköy / Anadolu Kavağı
  { ad: "Üsküdar Simit Sarayı", tur: "yeme_icme", lat: 41.0226, lng: 29.0093 },
  { ad: "Kuzguncuk Bahçe Cafe", tur: "yeme_icme", lat: 41.0335, lng: 29.033 },
  { ad: "Beykoz Balık Restoranı", tur: "balikci", lat: 41.1245, lng: 29.0938 },
  { ad: "Sarıyer Balıkçı Meyhanesi", tur: "balikci", lat: 41.1673, lng: 29.0567 },
  { ad: "Yeniköy Meyhanesi", tur: "balikci", lat: 41.1128, lng: 29.0642 },
  { ad: "Anadolu Kavağı Balık Lokantası", tur: "balikci", lat: 41.1885, lng: 29.0827 },
  { ad: "Rumeli Balıkçı Han", tur: "balikci", lat: 41.085, lng: 29.055 },
  // --- Bakırköy / Yeşilköy / Florya / Maltepe / Pendik
  { ad: "Bakırköy Aile Çay Bahçesi", tur: "yeme_icme", lat: 40.9819, lng: 28.8772 },
  { ad: "Yeşilköy Cafe", tur: "yeme_icme", lat: 40.9709, lng: 28.8225 },
  { ad: "Florya Sahil Restoran", tur: "yeme_icme", lat: 40.9765, lng: 28.7883 },
  { ad: "Maltepe Sahil Kahve", tur: "yeme_icme", lat: 40.9354, lng: 29.1305 },
  { ad: "Kumkapı Balık Sofrası", tur: "balikci", lat: 41.0043, lng: 28.956 },
  // --- Kalan çeşitlilik
  { ad: "Sahil Kahve", tur: "yeme_icme", lat: 41.0082, lng: 28.9784 },
  { ad: "Nefes Cafe & Bistro", tur: "yeme_icme", lat: 41.0395, lng: 28.985 },
  { ad: "Yaprak Döner Evi", tur: "yeme_icme", lat: 41.0125, lng: 28.955 },
  { ad: "Bosphorus Coffee Roasters", tur: "yeme_icme", lat: 41.0615, lng: 29.007 },
  { ad: "Mangal Keyfi", tur: "yeme_icme", lat: 41.03, lng: 28.965 },
  { ad: "Zeytin Ağacı Restoran", tur: "yeme_icme", lat: 41.045, lng: 29.001 },
  { ad: "Kahve Diyarı", tur: "yeme_icme", lat: 41.02, lng: 28.98 },
  { ad: "Ada Kahvesi", tur: "yeme_icme", lat: 40.995, lng: 29.02 },
  { ad: "Kokoreççi Baba", tur: "yeme_icme", lat: 41.0175, lng: 28.9625 },
  { ad: "Fırından Sıcak", tur: "yeme_icme", lat: 41.055, lng: 28.99 },
  { ad: "Tekne Cafe", tur: "yeme_icme", lat: 41.07, lng: 29.02 },
];

const OZELLIK_ANAHTARLARI = [
  "priz", "bahce", "petFriendly", "nargile", "wifi", "otopark", "canliMuzik", "macYayini",
];

const FIYAT_SEGMENTLERI = ["ucuz", "orta", "pahali"];

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
];

const KATEGORI_ADLARI = ["Kahveler", "Tatlılar", "Ana Yemekler", "Atıştırmalıklar", "Soğuk İçecekler"];

const TUKETICI_ADLARI = [
  "Ahmet Yılmaz", "Ayşe Kaya", "Mehmet Demir", "Fatma Şahin", "Mustafa Çelik",
  "Zeynep Yıldız", "Ali Aydın", "Elif Öztürk", "Hüseyin Arslan", "Emine Doğan",
  "İbrahim Kılıç", "Hatice Aslan", "Hasan Çetin", "Sultan Kara", "Murat Koç",
  "Kübra Kurt", "Ömer Özdemir", "Merve Aksoy", "Yusuf Türk", "Esra Şen",
  "Burak Yalçın", "Büşra Güneş", "Emre Polat", "Sevgi Bulut", "Kemal Er",
  "Aslı Uçar", "Serkan Bozkurt", "Gizem Tan", "Onur Keskin", "Damla Işık",
  "Barış Aksu", "Pınar Çakır", "Cem Avcı", "Selin Erdoğan", "Tolga Şimşek",
  "Deniz Yavuz", "Gökhan Acar", "Nazlı Tekin", "Volkan Sarı", "İpek Coşkun",
  "Ferhat Bayram", "Ceren Özkan", "Erdem Aktaş", "Tuğçe Kaplan", "Serhat Duran",
  "Melis Yıldırım", "Kaan Öz", "Buse Karaca", "Umut Ekşi", "Yasemin Bilgin",
  "Fatih Sönmez", "Gamze Balcı", "Recep Uysal", "Nesrin Toprak", "Bora Güler",
  "Selen Ateş", "Cansu Turan", "Eren Dinç", "Aylin Şeker", "Taner Girgin",
];

async function main() {
  const prisma = createScriptClient();
  const sifreHash = await bcrypt.hash(SIFRE, 10);
  const kullanilanSluglar = new Set<string>();

  try {
    console.log("İşletmeler oluşturuluyor…");
    const bizIdler: { id: string; tur: Tur; plusOrtagi: boolean }[] = [];

    for (const [i, isletme] of ISLETMELER.entries()) {
      let slug = slugla(isletme.ad);
      while (kullanilanSluglar.has(slug)) slug = `${slug}-${i}`;
      kullanilanSluglar.add(slug);

      const hesap = await prisma.account.upsert({
        where: { id: `demo-hesap-${slug}` },
        create: {
          id: `demo-hesap-${slug}`,
          name: isletme.ad,
          email: `${slug}@biyerlere-demo.local`,
          menuEnabled: true,
        },
        update: {},
      });

      const ozellikler = birkaci(OZELLIK_ANAHTARLARI, aralikta(0, 4));
      const plusOrtagi = Math.random() < 0.18;
      // Bu haftanın pazartesisi — birkaç işletme Hero Banner'da sponsor olsun.
      const buHaftaninPazartesi = new Date();
      buHaftaninPazartesi.setHours(0, 0, 0, 0);
      buHaftaninPazartesi.setDate(
        buHaftaninPazartesi.getDate() - ((buHaftaninPazartesi.getDay() + 6) % 7),
      );
      const sponsorMu = i < 3;

      const business = await prisma.business.upsert({
        where: { id: `demo-biz-${slug}` },
        create: {
          id: `demo-biz-${slug}`,
          accountId: hesap.id,
          name: isletme.ad,
          slug,
          type: isletme.tur,
          brandColor: rasgele(["#6366F1", "#F59E0B", "#EC4899", "#10B981", "#0EA5E9", "#8B5CF6"]),
          latitude: isletme.lat + (Math.random() - 0.5) * 0.004,
          longitude: isletme.lng + (Math.random() - 0.5) * 0.004,
          priceSegment: rasgele(FIYAT_SEGMENTLERI),
          mekanOzellikleri: ozellikler.join(","),
          biyerlerePlusOrtagi: plusOrtagi,
          sponsorHaftasi: sponsorMu ? buHaftaninPazartesi : null,
        },
        update: {
          latitude: isletme.lat + (Math.random() - 0.5) * 0.004,
          longitude: isletme.lng + (Math.random() - 0.5) * 0.004,
        },
      });
      bizIdler.push({ id: business.id, tur: isletme.tur, plusOrtagi });

      await prisma.user.upsert({
        where: { username: `${slug}.demo` },
        create: {
          accountId: hesap.id,
          name: `${isletme.ad} Sahibi`,
          username: `${slug}.demo`,
          email: `${slug}.sahip@biyerlere-demo.local`,
          passwordHash: sifreHash,
          role: "owner",
          moduller: ["kesfet", "menu"],
        },
        update: {},
      });

      // İlk 18 işletmeye kısa bir menü — mekan detayında "Öne çıkan
      // lezzetler" boş kalmasın.
      if (i < 18) {
        const mevcutKategori = await prisma.menuCategory.findFirst({
          where: { businessId: business.id },
        });
        if (!mevcutKategori) {
          const kategori = await prisma.menuCategory.create({
            data: { businessId: business.id, name: rasgele(KATEGORI_ADLARI), sortOrder: 1 },
          });
          const urunler = birkaci(URUN_HAVUZU, aralikta(3, 5));
          for (const [sira, urun] of urunler.entries()) {
            await prisma.menuItem.create({
              data: {
                businessId: business.id,
                categoryId: kategori.id,
                name: urun.ad,
                priceKurus: urun.fiyat,
                sortOrder: sira,
              },
            });
          }
        }
      }

      // ~10 işletmeye aktif bir duyuru — Etkinlikler sayfası ve haritadaki
      // yeşil "bu hafta bir şey var" pinleri boş kalmasın.
      if (i % 5 === 0) {
        const mevcutDuyuru = await prisma.duyuru.findFirst({ where: { businessId: business.id } });
        if (!mevcutDuyuru) {
          await prisma.duyuru.create({
            data: {
              businessId: business.id,
              baslik: rasgele([
                "Bu hafta sonu canlı müzik",
                "Yeni sezon menüsü başladı",
                "Hafta içi %20 indirim",
                "Kahvaltı saatleri uzatıldı",
              ]),
              aciklama: "Detaylar için bize uğrayın.",
              aktif: true,
              sortOrder: 1,
            },
          });
        }
      }
    }

    console.log(`${bizIdler.length} işletme hazır.`);

    console.log("Tüketiciler oluşturuluyor…");
    const appUserIdler: string[] = [];
    for (const ad of TUKETICI_ADLARI) {
      const username = slugla(ad).replace(/-/g, ".");
      let referralCode = davetKoduUret();
      // Çok düşük ihtimal ama unique alan — çakışırsa yeniden üret.
      for (let deneme = 0; deneme < 5; deneme++) {
        const catisan = await prisma.appUser.findUnique({ where: { referralCode } });
        if (!catisan) break;
        referralCode = davetKoduUret();
      }
      const appUser = await prisma.appUser.upsert({
        where: { username },
        create: {
          username,
          name: ad,
          passwordHash: sifreHash,
          referralCode,
          plusUyeMi: Math.random() < 0.12,
        },
        update: {},
      });
      appUserIdler.push(appUser.id);
    }
    console.log(`${appUserIdler.length} tüketici hazır.`);

    console.log("Ziyaretler, favoriler ve yorumlar işleniyor…");
    let toplamZiyaret = 0;
    let toplamFavori = 0;
    let toplamYorum = 0;
    let toplamKupon = 0;

    for (const appUserId of appUserIdler) {
      // Ziyaret sayısı dağılımı: çoğu yeni/az aktif, birkaçı çok aktif.
      const ziyaretSayisi =
        Math.random() < 0.15 ? 0 : Math.random() < 0.7 ? aralikta(1, 4) : aralikta(5, 14);

      const ziyaretEdilenBizIdler: string[] = [];
      const ziyaretSayaci = new Map<string, number>();
      const canliMuzikMekanlari = new Set<string>();

      for (let i = 0; i < ziyaretSayisi; i++) {
        // Bir miktar "sadakat" olsun diye %40 ihtimalle daha önce gittiği
        // bir mekana, aksi halde rastgele yeni bir mekana gidiyor.
        const tekrarMi = ziyaretEdilenBizIdler.length > 0 && Math.random() < 0.4;
        const hedef = tekrarMi
          ? rasgele(ziyaretEdilenBizIdler)
          : rasgele(bizIdler).id;

        const gunOnce = aralikta(0, 120);
        const tarih = new Date(Date.now() - gunOnce * 24 * 60 * 60 * 1000);

        await prisma.appVisit.create({
          data: { appUserId, businessId: hedef, mesafeMetre: aralikta(5, 90), createdAt: tarih },
        });
        toplamZiyaret += 1;
        ziyaretEdilenBizIdler.push(hedef);
        ziyaretSayaci.set(hedef, (ziyaretSayaci.get(hedef) ?? 0) + 1);

        const isletme = bizIdler.find((b) => b.id === hedef);
        if (isletme?.tur === "gece_kulubu") canliMuzikMekanlari.add(hedef);
      }

      if (ziyaretSayisi > 0) {
        const ozet: ZiyaretOzeti = {
          toplamZiyaret: ziyaretSayisi,
          farkliMekan: new Set(ziyaretEdilenBizIdler).size,
          canliMuzikMekani: canliMuzikMekanlari.size,
          enCokZiyaretEdilenMekan: Math.max(...ziyaretSayaci.values()),
        };
        const rozetler = hakEdilenRozetler(ozet);
        const ROZET_PUANLARI: Record<string, number> = {
          ilkAdim: 50, kahveGurmesi: 150, geceKusu: 150, ustaKasif: 300, mudavim: 200,
        };
        let puan = ziyaretSayisi * 50;
        for (const rozet of rozetler) {
          puan += ROZET_PUANLARI[rozet] ?? 0;
          await prisma.appBadge.upsert({
            where: { appUserId_rozet: { appUserId, rozet } },
            create: { appUserId, rozet },
            update: {},
          });
        }
        await prisma.appUser.update({ where: { id: appUserId }, data: { puan } });

        // Sadakat eşiğini (10 ziyaret) aşan bir mekan varsa aktif bir kupon bırak.
        for (const [bizId, sayi] of ziyaretSayaci.entries()) {
          if (sayi >= 10) {
            await prisma.coupon.create({
              data: {
                businessId: bizId,
                appUserId,
                code: `SADAKAT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
                discount: "Ücretsiz kahve (sadakat ödülü)",
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              },
            });
            toplamKupon += 1;
          }
        }
      }

      // Favoriler: gittiği mekanlardan birkaçını + rastgele 0-2 mekanı favorile.
      const favoriAdaylari = new Set([...ziyaretEdilenBizIdler, ...birkaci(bizIdler.map((b) => b.id), 2)]);
      for (const bizId of birkaci([...favoriAdaylari], aralikta(0, 4))) {
        const mevcut = await prisma.appFavorite.findUnique({
          where: { appUserId_businessId: { appUserId, businessId: bizId } },
        });
        if (!mevcut) {
          await prisma.appFavorite.create({ data: { appUserId, businessId: bizId } });
          toplamFavori += 1;
        }
      }

      // Yorumlar: ziyaret ettiği mekanlardan bir kısmına gerçek, yazılı bir
      // yorum bırak — appUserId dolu olduğu için "%100 doğrulanmış yorum"
      // olarak mekan profilinde görünür.
      for (const bizId of birkaci(ziyaretEdilenBizIdler, aralikta(0, 2))) {
        await prisma.feedback.create({
          data: {
            businessId: bizId,
            appUserId,
            overallRating: rasgele([3, 4, 4, 5]),
            comment: rasgele([
              "Ortam çok keyifliydi, tekrar geleceğiz.",
              "Lezzetler gayet başarılı, tavsiye ederim.",
              "Servis hızlıydı, personel ilgiliydi.",
              "Fiyat/performans olarak güzel bir yer.",
              "Manzarası ve atmosferi harika.",
            ]),
            status: "yeni",
          },
        });
        toplamYorum += 1;
      }
    }

    console.log(`${toplamZiyaret} ziyaret, ${toplamFavori} favori, ${toplamYorum} doğrulanmış yorum, ${toplamKupon} sadakat kuponu oluşturuldu.`);
    console.log(`\nTüm demo hesaplarının şifresi: ${SIFRE}`);
    console.log("(Bu şifreyi not almanıza gerek yok — hesaplar gerçek kullanıcı girişi için değil, yalnızca Keşfet/Harita'yı doldurmak için.)");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
