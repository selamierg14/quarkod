import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { duyuruAktifMi } from "@/lib/duyuru";
import { ozellikleriCoz } from "@/lib/mekan";
import { duyuruGorselAdresi, gorselAdresi } from "@/lib/gorsel-adres";
import { mekanlariSuz, sinirKutusu, sorguCoz } from "@/lib/kesfet";

export const dynamic = "force-dynamic";

/**
 * Biyerlere keşfet listesi: haritadaki pinler ve akıştaki mekan kartları.
 *
 * KİMLİK GEREKTİRMİYOR. Uygulamayı ilk açan kişi, hesap açmadan önce
 * çevresinde ne olduğunu görebilmeli; giriş duvarı ardındaki bir keşif
 * ekranı kimseyi kaydolmaya ikna etmez. Dönen veri zaten kamuya açık bir
 * rehber bilgisi (ad, adres, menü fiyatı) — müşteri masada QR okutunca
 * da aynısını görüyor.
 *
 * Hangi işletme listeleniyor? Üç koşul birden:
 *   1. Hesabın "kesfet" modülü açık (satılabilir bir kalem — modülü
 *      olmayan müşteri uygulamada görünmez),
 *   2. Hesap aktif ve aboneliği dolmamış,
 *   3. İşletmenin koordinatı girilmiş (haritaya konulamayan mekanı
 *      listelemek anlamsız).
 */
export async function GET(request: NextRequest) {
  const sorgu = sorguCoz(request.nextUrl.searchParams);
  const simdi = new Date();

  const kutu = sorgu.konum ? sinirKutusu(sorgu.konum, sorgu.yaricapMetre) : null;

  const isletmeler = await prisma.business.findMany({
    where: {
      // Koordinatsız mekan haritaya konulamaz.
      latitude: { not: null },
      longitude: { not: null },
      account: {
        active: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: simdi } }],
        // Modül hesabın SAHİBİNDE tutuluyor (bkz. hesaplar/actions.ts).
        users: { some: { role: "owner", moduller: { has: "kesfet" } } },
      },
      ...(sorgu.arama
        ? { name: { contains: sorgu.arama, mode: "insensitive" as const } }
        : {}),
      // Mesafeyi veritabanında hesaplamak yerine önce ucuz bir dikdörtgen:
      // kesin mesafe bellekte, mekanlariSuz içinde hesaplanıyor.
      ...(kutu
        ? {
            latitude: { gte: kutu.enlemMin, lte: kutu.enlemMax },
            longitude: { gte: kutu.boylamMin, lte: kutu.boylamMax },
          }
        : {}),
    },
    // Alanlar TEK TEK seçiliyor. Business'ta panele özel bilgiler var
    // (bildirim eşiği, İYS marka kodu, Wi-Fi ŞİFRESİ, Google yönlendirme
    // tercihi); include ya da geniş bir select bunları kamuya açık bir
    // uca sızdırırdı.
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
    // Kutu yoksa (konumsuz sorgu) liste sınırsız büyümesin.
    take: 200,
  });

  // Puan ortalaması ayrı bir toplu sorguda: her işletme için ayrı ayrı
  // sormak N+1 olurdu.
  const puanlar = await prisma.feedback.groupBy({
    by: ["businessId"],
    where: { businessId: { in: isletmeler.map((b) => b.id) } },
    _avg: { overallRating: true },
  });
  const puanHaritasi = new Map(
    puanlar.map((p) => [p.businessId, p._avg.overallRating]),
  );

  const suzulmus = mekanlariSuz(isletmeler, sorgu);

  return NextResponse.json({
    adet: suzulmus.length,
    mekanlar: suzulmus.map((m) => ({
      id: m.id,
      slug: m.slug,
      ad: m.name,
      tur: m.type,
      adres: m.address,
      // Görselin KENDİSİ değil adresi dönüyor. Data URI'leri listeye
      // gömmek tek mekanlı bir yanıtı 164 KB yapıyordu; elli mekanlı bir
      // keşfet ekranı mobil veriyle açılamazdı.
      //
      // Adresi müşteri QR sayfalarıyla AYNI yardımcı üretiyor: aynı işi
      // yapan ikinci bir uç yazmak yerine mevcut /g/... ucu kullanılıyor.
      // O uç içerik özetini adrese koyup ETag ile 304 dönebiliyor, yani
      // görsel bir kez inip bir daha inmiyor.
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
      // Tarih penceresi burada süzülüyor: "aktif" bayrağı açık olsa bile
      // başlangıcı gelmemiş ya da bitmiş bir afiş gösterilmemeli.
      etkinlikler: m.duyurular.filter((d) => duyuruAktifMi(d)).map((d) => ({
        id: d.id,
        baslik: d.baslik,
        aciklama: d.aciklama,
        gorselUrl: duyuruGorselAdresi(d.id, d.imageUrl),
        baslangic: d.baslangic,
        bitis: d.bitis,
      })),
    })),
  });
}
