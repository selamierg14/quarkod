import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { appKullaniciGerekli } from "@/lib/app-api";
import { ROZETLER, gecerliRozetMi } from "@/lib/rozet";

export const dynamic = "force-dynamic";

export type BildirimOgesi = {
  id: string;
  tur: "rozet" | "kupon" | "duyuru";
  tarih: string;
  baslik: string;
  aciklama: string | null;
  href: string;
};

/**
 * Uygulama içi bildirim akışı — ayrı bir "bildirim" tablosu YOK, üç gerçek
 * sinyal birleştiriliyor: kazanılan rozetler, cüzdana düşen kuponlar ve
 * FAVORİLENEN mekanlardaki yeni duyurular. Sahte/statik bir "3 yeni
 * bildirim" listesi yerine zaten var olan verinin kendisi — bkz.
 * Header.tsx'teki aynı prensip (kupon sayısı sahte rozet yerine kullanılan
 * gerçek sinyaldi; artık bu uç onun yerini alıyor).
 *
 * "Okundu" durumu sunucuda tutulmuyor — istemci, en son görülen bildirimin
 * tarihini localStorage'da tutup rozeti ona göre hesaplıyor (bkz.
 * BottomNav/Header'daki kullanım). Bu yüzden burada limit dışında bir
 * filtre yok, sadece kronolojik birleşim.
 */
export async function GET(request: Request) {
  const oturum = await appKullaniciGerekli(request);
  if ("yanit" in oturum) return oturum.yanit;
  const appUserId = oturum.kullanici.id;

  const [rozetler, kuponlar, favoriIsletmeIdleri] = await Promise.all([
    prisma.appBadge.findMany({ where: { appUserId }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.coupon.findMany({
      where: { appUserId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        code: true,
        discount: true,
        createdAt: true,
        business: { select: { slug: true, name: true } },
      },
    }),
    prisma.appFavorite.findMany({ where: { appUserId }, select: { businessId: true } }),
  ]);

  const favoriIdler = favoriIsletmeIdleri.map((f) => f.businessId);
  const duyurular = favoriIdler.length
    ? await prisma.duyuru.findMany({
        where: { businessId: { in: favoriIdler }, aktif: true },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          baslik: true,
          aciklama: true,
          createdAt: true,
          business: { select: { slug: true, name: true } },
        },
      })
    : [];

  const ogeler: BildirimOgesi[] = [
    ...rozetler
      .filter((r) => gecerliRozetMi(r.rozet))
      .map((r): BildirimOgesi => ({
        id: `rozet-${r.id}`,
        tur: "rozet",
        tarih: r.createdAt.toISOString(),
        baslik: `Yeni rozet: ${ROZETLER[r.rozet as keyof typeof ROZETLER].ad}`,
        aciklama: ROZETLER[r.rozet as keyof typeof ROZETLER].aciklama,
        href: "/profil",
      })),
    ...kuponlar.map(
      (k): BildirimOgesi => ({
        id: `kupon-${k.id}`,
        tur: "kupon",
        tarih: k.createdAt.toISOString(),
        baslik: `Cüzdanına kupon düştü: ${k.discount}`,
        aciklama: `${k.business.name} · ${k.code}`,
        href: "/cuzdan",
      }),
    ),
    ...duyurular.map(
      (d): BildirimOgesi => ({
        id: `duyuru-${d.id}`,
        tur: "duyuru",
        tarih: d.createdAt.toISOString(),
        baslik: `${d.business.name}: ${d.baslik}`,
        aciklama: d.aciklama,
        href: `/mekan/${d.business.slug}`,
      }),
    ),
  ].sort((a, b) => (a.tarih < b.tarih ? 1 : -1));

  return NextResponse.json({ ogeler: ogeler.slice(0, 50) });
}
