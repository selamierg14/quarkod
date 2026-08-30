import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { gorselAdresi } from "@/lib/gorsel-adres";
import {
  ROZETLER,
  ROZET_ANAHTARLARI,
  gecerliRozetMi,
  seviye,
  sonrakiSeviyeyeKalan,
} from "@/lib/rozet";
import { appKullaniciGerekli } from "@/lib/app-api";

export const dynamic = "force-dynamic";

/**
 * Profil ekranı: seviye, rozet koleksiyonu ve son ziyaretler.
 *
 * Rozet listesi KAZANILMAYANLARI da içeriyor. Profil ekranının işi
 * yalnızca başarıyı sergilemek değil, bir sonraki hedefi göstermek:
 * "Usta Kaşif — 10 farklı mekan" yazısını gören kullanıcı nereye
 * gideceğini biliyor. Kazanılmamış rozetler `kazanildi: false` ile
 * geliyor, mobil taraf onları soluk gösteriyor.
 */
export async function GET(request: Request) {
  const oturum = await appKullaniciGerekli(request);
  if ("yanit" in oturum) return oturum.yanit;

  const [rozetler, ziyaretler, ziyaretSayisi, kuponSayisi] = await Promise.all([
    prisma.appBadge.findMany({
      where: { appUserId: oturum.kullanici.id },
      select: { rozet: true, createdAt: true },
    }),
    prisma.appVisit.findMany({
      where: { appUserId: oturum.kullanici.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        createdAt: true,
        business: { select: { id: true, slug: true, name: true, logoUrl: true } },
      },
    }),
    prisma.appVisit.count({ where: { appUserId: oturum.kullanici.id } }),
    prisma.coupon.count({
      where: { appUserId: oturum.kullanici.id, used: false },
    }),
  ]);

  const kazanilanlar = new Map(
    rozetler
      .filter((r) => gecerliRozetMi(r.rozet))
      .map((r) => [r.rozet, r.createdAt]),
  );

  return NextResponse.json({
    kullanici: {
      ...oturum.kullanici,
      seviye: seviye(oturum.kullanici.puan),
      sonrakiSeviyeyeKalan: sonrakiSeviyeyeKalan(oturum.kullanici.puan),
      dogrulanmisZiyaret: ziyaretSayisi,
      cuzdandakiKupon: kuponSayisi,
    },
    rozetler: ROZET_ANAHTARLARI.map((anahtar) => ({
      anahtar,
      ad: ROZETLER[anahtar].ad,
      aciklama: ROZETLER[anahtar].aciklama,
      puan: ROZETLER[anahtar].puan,
      kazanildi: kazanilanlar.has(anahtar),
      kazanilmaTarihi: kazanilanlar.get(anahtar) ?? null,
    })),
    sonZiyaretler: ziyaretler.map((z) => ({
      id: z.id,
      tarih: z.createdAt,
      mekan: {
        id: z.business.id,
        slug: z.business.slug,
        ad: z.business.name,
        logoUrl: gorselAdresi(z.business.id, "logo", z.business.logoUrl),
      },
    })),
  });
}
