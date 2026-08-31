import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { duyuruAktifMi } from "@/lib/duyuru";
import { ozellikleriCoz } from "@/lib/mekan";
import {
  duyuruGorselAdresi,
  gorselAdresi,
  urunGorselAdresi,
} from "@/lib/gorsel-adres";
import { parseAlerjenler, parseOzelBilesenler, parseTags } from "@/lib/menu";

export const dynamic = "force-dynamic";

/**
 * Tek mekanın detayı: kapak, etkinlik takvimi ve canlı menü.
 *
 * Listeden (../route.ts) ayrı bir uç olmasının sebebi hacim: menü onlarca
 * ürün taşıyor ve bunu liste yanıtına koymak, kullanıcı hiç açmayacağı
 * kırk mekanın menüsünü de indirmesi demekti. Mobil taraf listeyi
 * gösteriyor, kullanıcı bir karta dokununca burayı çağırıyor.
 *
 * Görünürlük kuralları listeyle aynı — tek yerde tutulamadı çünkü Prisma
 * `where` nesnesi iki sorguda farklı şekillerde birleşiyor; ikisi
 * değişirse birlikte değişmeli.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const simdi = new Date();

  const mekan = await prisma.business.findFirst({
    where: {
      slug,
      latitude: { not: null },
      longitude: { not: null },
      account: {
        active: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: simdi } }],
        // `active: true` şart: askıya alınmış tek sahibi olan bir işletme
        // aksi halde uygulamada görünmeye devam ederdi. Hesabı yöneten
        // kimse kalmamışken mekanı keşfette tutmak, güncellenmeyen bir
        // menüyü ve kapanmış olabilecek bir yeri müşteriye önermek olurdu.
        users: {
          some: { role: "owner", active: true, moduller: { has: "kesfet" } },
        },
      },
    },
    // Alanlar tek tek: Business'ta bildirim eşiği, İYS kodu ve Wi-Fi
    // ŞİFRESİ gibi panele özel bilgiler var.
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
      // Sipariş bağlantıları müşteriye zaten QR karşılama ekranında
      // gösteriliyor; keşfette de göstermek aynı bilginin ikinci yolu.
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

  if (!mekan) {
    return NextResponse.json({ hata: "Mekan bulunamadı." }, { status: 404 });
  }

  const puan = await prisma.feedback.aggregate({
    where: { businessId: mekan.id },
    _avg: { overallRating: true },
  });

  return NextResponse.json({
    mekan: {
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
      etkinlikler: mekan.duyurular.filter((d) => duyuruAktifMi(d)).map((d) => ({
        id: d.id,
        baslik: d.baslik,
        aciklama: d.aciklama,
        gorselUrl: duyuruGorselAdresi(d.id, d.imageUrl),
        baslangic: d.baslangic,
        bitis: d.bitis,
      })),
      menu: {
        fiyatGuncelleme: mekan.menuPriceUpdatedAt,
        // Boş bölüm gösterilmiyor: müşteri "Tatlılar" başlığına dokunup
        // boş bir ekranla karşılaşmasın.
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
              // Zorunlu menü bilgileri. `bilgilerDogrulandi` bilerek
              // gönderiliyor: şablondan gelen tipik değerler işletmenin
              // beyanı gibi gösterilmemeli (bkz. prisma/schema.prisma).
              icindekiler: u.icindekiler,
              kaloriKcal: u.kaloriKcal,
              alerjenler: parseAlerjenler(u.alerjenler),
              ozelBilesenler: parseOzelBilesenler(u.ozelBilesenler),
              bilgilerDogrulandi: u.bilgilerDogrulandi,
            })),
          })),
      },
    },
  });
}
