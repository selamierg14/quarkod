import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { gorselAdresi } from "@/lib/gorsel-adres";
import { guncelKupon } from "@/lib/kupon-kod";
import { sadakatDurumuHesapla } from "@/lib/sadakat";
import { appKullaniciGerekli } from "@/lib/app-api";

export const dynamic = "force-dynamic";

/**
 * Cüzdan: kullanılmamış kuponlar, sadakat damga kartları ve geçmiş kuponlar.
 *
 * Kod her istekte YENİDEN üretiliyor ve 15 dakikalık pencereye bağlı
 * (bkz. lib/kupon-kod.ts). Veritabanında saklanan sabit bir kod olsaydı
 * ekran görüntüsü sonsuza kadar geçerli kalır, tek kupon bir grupta
 * paylaşılırdı.
 */
export async function GET(request: Request) {
  const oturum = await appKullaniciGerekli(request);
  if ("yanit" in oturum) return oturum.yanit;

  const simdi = new Date();

  const [aktifKuponlar, gecmisKuponlar, ziyaretGruplari] = await Promise.all([
    prisma.coupon.findMany({
      where: {
        appUserId: oturum.kullanici.id,
        used: false,
        OR: [{ expiresAt: null }, { expiresAt: { gt: simdi } }],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        discount: true,
        expiresAt: true,
        createdAt: true,
        business: { select: { id: true, slug: true, name: true, logoUrl: true } },
      },
    }),
    // Geçmiş: kullanılmış YA DA süresi dolmuş — "şu an ne kullanabilirim"
    // sorusunun tersi, "elimden ne geçti" dökümü. En yeni 20 kayıt yeterli.
    prisma.coupon.findMany({
      where: {
        appUserId: oturum.kullanici.id,
        OR: [{ used: true }, { expiresAt: { lte: simdi } }],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        discount: true,
        used: true,
        usedAt: true,
        expiresAt: true,
        business: { select: { id: true, slug: true, name: true, logoUrl: true } },
      },
    }),
    // Sadakat damga kartı: her mekan için doğrulanmış ziyaret sayısı.
    prisma.appVisit.groupBy({
      by: ["businessId"],
      where: { appUserId: oturum.kullanici.id },
      _count: { _all: true },
    }),
  ]);

  const isletmeIdleri = ziyaretGruplari.map((g) => g.businessId);
  const isletmeler = isletmeIdleri.length
    ? await prisma.business.findMany({
        where: { id: { in: isletmeIdleri } },
        select: { id: true, slug: true, name: true, logoUrl: true },
      })
    : [];
  const isletmeHaritasi = new Map(isletmeler.map((b) => [b.id, b]));

  return NextResponse.json({
    kuponlar: aktifKuponlar.map((k) => {
      const { kod, kalanSaniye } = guncelKupon(k.id, simdi);
      return {
        id: k.id,
        indirim: k.discount,
        sonKullanma: k.expiresAt,
        mekan: {
          id: k.business.id,
          slug: k.business.slug,
          ad: k.business.name,
          logoUrl: gorselAdresi(k.business.id, "logo", k.business.logoUrl),
        },
        // Kasada okutulacak kod ve pencerenin bitişine kalan süre.
        // Mobil taraf geri sayımı gösterip süre bitince listeyi yeniliyor.
        kod,
        kodKalanSaniye: kalanSaniye,
      };
    }),
    gecmisKuponlar: gecmisKuponlar.map((k) => ({
      id: k.id,
      indirim: k.discount,
      kullanildi: k.used,
      kullanilmaTarihi: k.usedAt,
      sonKullanma: k.expiresAt,
      mekan: {
        id: k.business.id,
        slug: k.business.slug,
        ad: k.business.name,
        logoUrl: gorselAdresi(k.business.id, "logo", k.business.logoUrl),
      },
    })),
    sadakatKartlari: ziyaretGruplari
      .map((g) => {
        const isletme = isletmeHaritasi.get(g.businessId);
        if (!isletme) return null;
        return {
          mekan: {
            id: isletme.id,
            slug: isletme.slug,
            ad: isletme.name,
            logoUrl: gorselAdresi(isletme.id, "logo", isletme.logoUrl),
          },
          ...sadakatDurumuHesapla(g._count._all),
        };
      })
      .filter((k): k is NonNullable<typeof k> => k !== null),
  });
}
