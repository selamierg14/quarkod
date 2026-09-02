import "server-only";
import { prisma } from "./db";
import { duyuruAktifMi } from "./duyuru";
import { ozellikleriCoz } from "./mekan";
import { duyuruGorselAdresi, gorselAdresi, urunGorselAdresi } from "./gorsel-adres";
import { parseAlerjenler, parseOzelBilesenler, parseTags } from "./menu";
import { mekanlariSuz, sinirKutusu, type KesfetSorgusu } from "./kesfet";

/**
 * Keşfet listesi ve mekan detayının veri katmanı.
 *
 * `/api/app/mekanlar*` (mobil/native istemciler için JSON uç) ve Biyerlere
 * web sayfaları (`src/app/(biyerlere)/**`) AYNI sorguyu iki kez yazmasın
 * diye buradan besleniyor. Next.js'te bir Server Component'in kendi
 * API'sini `fetch` ile çağırması (ekstra bir HTTP turu, kendi kendine
 * istek) önerilmez — ikisi de doğrudan bu fonksiyonları çağırıyor.
 *
 * Görünürlük kuralı ÜÇÜ BİRDEN sağlanmalı (bkz. api/app/mekanlar/route.ts
 * ve mekanlar/[slug]/route.ts'in eski hâlindeki aynı yorum):
 *   1. Hesabın "kesfet" modülü açık,
 *   2. Hesap aktif ve aboneliği dolmamış,
 *   3. Sahibi aktif (askıya alınmış tek sahibi olan işletme görünmemeli).
 */

const GORUNURLUK_KOSULU = (simdi: Date) => ({
  active: true,
  OR: [{ expiresAt: null }, { expiresAt: { gt: simdi } }],
  users: {
    some: { role: "owner" as const, active: true, moduller: { has: "kesfet" } },
  },
});

export type MekanOzet = {
  id: string;
  slug: string;
  ad: string;
  tur: string;
  adres: string | null;
  logoUrl: string | null;
  kapakUrl: string | null;
  markaRengi: string;
  instagram: string | null;
  konum: { enlem: number | null; boylam: number | null };
  mesafeMetre: number | null;
  fiyatSegmenti: string | null;
  ozellikler: string[];
  puan: number | null;
  degerlendirmeSayisi: number;
  etkinlikler: {
    id: string;
    baslik: string;
    aciklama: string | null;
    gorselUrl: string | null;
    baslangic: Date | null;
    bitis: Date | null;
  }[];
};

/** Keşfet listesi — StoriesBar, HeroBanner ve MekanKarti'nin ham verisi. */
export async function mekanlariGetir(
  sorgu: KesfetSorgusu,
): Promise<{ adet: number; mekanlar: MekanOzet[] }> {
  const simdi = new Date();
  const kutu = sorgu.konum ? sinirKutusu(sorgu.konum, sorgu.yaricapMetre) : null;

  const isletmeler = await prisma.business.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
      account: GORUNURLUK_KOSULU(simdi),
      ...(sorgu.arama
        ? { name: { contains: sorgu.arama, mode: "insensitive" as const } }
        : {}),
      ...(kutu
        ? {
            latitude: { gte: kutu.enlemMin, lte: kutu.enlemMax },
            longitude: { gte: kutu.boylamMin, lte: kutu.boylamMax },
          }
        : {}),
    },
    select: {
      id: true,
      slug: true,
      name: true,
      type: true,
      address: true,
      logoUrl: true,
      coverUrl: true,
      brandColor: true,
      instagramUrl: true,
      latitude: true,
      longitude: true,
      priceSegment: true,
      mekanOzellikleri: true,
      duyurular: {
        where: { aktif: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          baslik: true,
          aciklama: true,
          imageUrl: true,
          baslangic: true,
          bitis: true,
          aktif: true,
        },
      },
      _count: { select: { feedbacks: true } },
    },
    take: 200,
  });

  const puanlar = await prisma.feedback.groupBy({
    by: ["businessId"],
    where: { businessId: { in: isletmeler.map((b) => b.id) } },
    _avg: { overallRating: true },
  });
  const puanHaritasi = new Map(puanlar.map((p) => [p.businessId, p._avg.overallRating]));

  const suzulmus = mekanlariSuz(isletmeler, sorgu);

  return {
    adet: suzulmus.length,
    mekanlar: suzulmus.map((m) => ({
      id: m.id,
      slug: m.slug,
      ad: m.name,
      tur: m.type,
      adres: m.address,
      logoUrl: gorselAdresi(m.id, "logo", m.logoUrl),
      kapakUrl: gorselAdresi(m.id, "kapak", m.coverUrl),
      markaRengi: m.brandColor,
      instagram: m.instagramUrl,
      konum: { enlem: m.latitude, boylam: m.longitude },
      mesafeMetre: m.mesafeMetre,
      fiyatSegmenti: m.priceSegment,
      ozellikler: ozellikleriCoz(m.mekanOzellikleri),
      puan: puanHaritasi.get(m.id) ?? null,
      degerlendirmeSayisi: m._count.feedbacks,
      etkinlikler: m.duyurular
        .filter((d) => duyuruAktifMi(d))
        .map((d) => ({
          id: d.id,
          baslik: d.baslik,
          aciklama: d.aciklama,
          gorselUrl: duyuruGorselAdresi(d.id, d.imageUrl),
          baslangic: d.baslangic,
          bitis: d.bitis,
        })),
    })),
  };
}

export type MekanDetay = MekanOzet & {
  menu: {
    fiyatGuncelleme: Date | null;
    bolumler: {
      id: string;
      ad: string;
      urunler: {
        id: string;
        ad: string;
        aciklama: string | null;
        fiyatKurus: number | null;
        gorselUrl: string | null;
        etiketler: string[];
        tukendi: boolean;
        icindekiler: string | null;
        kaloriKcal: number | null;
        alerjenler: string[];
        ozelBilesenler: string[];
        bilgilerDogrulandi: boolean;
      }[];
    }[];
  };
  siparisLinkleri: {
    yemeksepeti: string | null;
    getir: string | null;
    trendyol: string | null;
    migros: string | null;
  };
  /**
   * %100 doğrulanmış masa yorumları — yalnızca anketi dolduran kişi AYNI
   * ANDA Biyerlere'ye de girişliyse (bkz. Feedback.appUserId, lib/davet.ts
   * DEĞİL, submitFeedback'teki appJeton bağlantısı). Girişsiz bırakılan
   * anketler burada hiç görünmez — "doğrulanmış" iddiası ancak kimliği
   * bilinen biri için anlamlı.
   */
  dogrulanmisYorumlar: {
    id: string;
    isim: string;
    yorum: string;
    puan: number;
    tarih: Date;
    rozetler: string[];
  }[];
};

/** Tek mekanın canlı profili — Adım 4'ün ham verisi. */
export async function mekanDetayGetir(slug: string): Promise<MekanDetay | null> {
  const simdi = new Date();

  const mekan = await prisma.business.findFirst({
    where: {
      slug,
      latitude: { not: null },
      longitude: { not: null },
      account: GORUNURLUK_KOSULU(simdi),
    },
    select: {
      id: true,
      slug: true,
      name: true,
      type: true,
      address: true,
      logoUrl: true,
      coverUrl: true,
      brandColor: true,
      instagramUrl: true,
      latitude: true,
      longitude: true,
      priceSegment: true,
      mekanOzellikleri: true,
      menuPriceUpdatedAt: true,
      yemeksepetiUrl: true,
      getirUrl: true,
      trendyolUrl: true,
      migrosUrl: true,
      duyurular: {
        where: { aktif: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          baslik: true,
          aciklama: true,
          imageUrl: true,
          baslangic: true,
          bitis: true,
          aktif: true,
        },
      },
      menuCategories: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          items: {
            where: { active: true },
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              name: true,
              description: true,
              priceKurus: true,
              imageUrl: true,
              tags: true,
              soldOut: true,
              icindekiler: true,
              kaloriKcal: true,
              alerjenler: true,
              ozelBilesenler: true,
              bilgilerDogrulandi: true,
            },
          },
        },
      },
      _count: { select: { feedbacks: true } },
    },
  });
  if (!mekan) return null;

  const [puan, dogrulanmis] = await Promise.all([
    prisma.feedback.aggregate({
      where: { businessId: mekan.id },
      _avg: { overallRating: true },
    }),
    prisma.feedback.findMany({
      where: { businessId: mekan.id, appUserId: { not: null }, comment: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        comment: true,
        overallRating: true,
        createdAt: true,
        appUser: {
          select: { name: true, rozetler: { select: { rozet: true }, take: 3 } },
        },
      },
    }),
  ]);

  return {
    id: mekan.id,
    slug: mekan.slug,
    ad: mekan.name,
    tur: mekan.type,
    adres: mekan.address,
    logoUrl: gorselAdresi(mekan.id, "logo", mekan.logoUrl),
    kapakUrl: gorselAdresi(mekan.id, "kapak", mekan.coverUrl),
    markaRengi: mekan.brandColor,
    instagram: mekan.instagramUrl,
    konum: { enlem: mekan.latitude, boylam: mekan.longitude },
    mesafeMetre: null,
    fiyatSegmenti: mekan.priceSegment,
    ozellikler: ozellikleriCoz(mekan.mekanOzellikleri),
    puan: puan._avg.overallRating,
    degerlendirmeSayisi: mekan._count.feedbacks,
    siparisLinkleri: {
      yemeksepeti: mekan.yemeksepetiUrl,
      getir: mekan.getirUrl,
      trendyol: mekan.trendyolUrl,
      migros: mekan.migrosUrl,
    },
    etkinlikler: mekan.duyurular
      .filter((d) => duyuruAktifMi(d))
      .map((d) => ({
        id: d.id,
        baslik: d.baslik,
        aciklama: d.aciklama,
        gorselUrl: duyuruGorselAdresi(d.id, d.imageUrl),
        baslangic: d.baslangic,
        bitis: d.bitis,
      })),
    menu: {
      fiyatGuncelleme: mekan.menuPriceUpdatedAt,
      bolumler: mekan.menuCategories
        .filter((k) => k.items.length > 0)
        .map((k) => ({
          id: k.id,
          ad: k.name,
          urunler: k.items.map((u) => ({
            id: u.id,
            ad: u.name,
            aciklama: u.description,
            fiyatKurus: u.priceKurus,
            gorselUrl: urunGorselAdresi(u.id, u.imageUrl),
            etiketler: parseTags(u.tags),
            tukendi: u.soldOut,
            icindekiler: u.icindekiler,
            kaloriKcal: u.kaloriKcal,
            alerjenler: parseAlerjenler(u.alerjenler),
            ozelBilesenler: parseOzelBilesenler(u.ozelBilesenler),
            bilgilerDogrulandi: u.bilgilerDogrulandi,
          })),
        })),
    },
    dogrulanmisYorumlar: dogrulanmis.map((f) => ({
      id: f.id,
      isim: f.appUser!.name,
      yorum: f.comment!,
      puan: f.overallRating,
      tarih: f.createdAt,
      rozetler: f.appUser!.rozetler.map((r) => r.rozet),
    })),
  };
}
