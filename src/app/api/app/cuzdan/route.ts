import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { gorselAdresi } from "@/lib/gorsel-adres";
import { guncelKupon } from "@/lib/kupon-kod";
import { appKullaniciGerekli } from "@/lib/app-api";

export const dynamic = "force-dynamic";

/**
 * Cüzdan: kullanıcının kullanılmamış kuponları ve kasada okutulacak kodlar.
 *
 * Kod her istekte YENİDEN üretiliyor ve 15 dakikalık pencereye bağlı
 * (bkz. lib/kupon-kod.ts). Veritabanında saklanan sabit bir kod olsaydı
 * ekran görüntüsü sonsuza kadar geçerli kalır, tek kupon bir grupta
 * paylaşılırdı.
 *
 * Süresi dolmuş ve kullanılmış kuponlar listelenmiyor: cüzdan "şu an ne
 * kullanabilirim" sorusunu cevaplamalı, geçmiş dökümü değil.
 */
export async function GET(request: Request) {
  const oturum = await appKullaniciGerekli(request);
  if ("yanit" in oturum) return oturum.yanit;

  const simdi = new Date();

  const kuponlar = await prisma.coupon.findMany({
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
      business: {
        select: { id: true, slug: true, name: true, logoUrl: true },
      },
    },
  });

  return NextResponse.json({
    kuponlar: kuponlar.map((k) => {
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
  });
}
