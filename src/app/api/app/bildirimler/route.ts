import { NextResponse } from "next/server";
import { prisma } from "@/lib/cekirdek/db";
import { appKullaniciGerekli } from "@/lib/kimlik/app-api";
import { ROZETLER, gecerliRozetMi } from "@/lib/biyerlere/rozet";
import { KUPON_AKTIF } from "@/lib/biyerlere/kupon";

export const dynamic = "force-dynamic";

export type BildirimOgesi = {
  id: string;
  tur: "rozet" | "kupon" | "duyuru" | "rezervasyon";
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
 * TERCİHLER burada uygulanıyor: rozet ve favori mekan duyurusu
 * kapatılabiliyor (bkz. lib/biyerlere/bildirim-tercihi.ts). Rezervasyon
 * satırı kapatılamıyor — kullanıcının kendi başlattığı işin sonucu.
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

  const kullanici = await prisma.appUser.findUnique({
    where: { id: appUserId },
    select: { bildirimFavoriDuyuru: true, bildirimRozet: true },
  });

  const [rozetler, kuponlar, favoriIsletmeIdleri, rezervasyonlar] = await Promise.all([
    kullanici?.bildirimRozet === false
      ? Promise.resolve([])
      : prisma.appBadge.findMany({ where: { appUserId }, orderBy: { createdAt: "desc" }, take: 30 }),
    // Kupon kapalıyken bildirim akışında kupon satırı hiç oluşmuyor
    // (bkz. lib/biyerlere/kupon.ts); rozet ve duyurular devam ediyor.
    KUPON_AKTIF
      ? prisma.coupon.findMany({
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
        })
      : Promise.resolve([]),
    prisma.appFavorite.findMany({ where: { appUserId }, select: { businessId: true } }),
    /**
     * Rezervasyon DURUMU — "onaylandı mı" sorusunun cevabı.
     *
     * Akışta olmasının sebebi uygulamanın kullanıcıya verdiği söz:
     * talep gönderildiğinde "mekan onayladığında haber vereceğiz"
     * diyoruz. Kayıt zaten var, ayrı bir bildirim tablosuna yazmaya
     * gerek yok (bkz. bu ucun üstündeki genel gerekçe).
     */
    prisma.rezervasyon.findMany({
      where: { appUserId, kanal: "biyerlere", durum: { in: ["onaylandi", "iptal"] } },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: {
        id: true,
        durum: true,
        baslangic: true,
        updatedAt: true,
        business: { select: { slug: true, name: true } },
      },
    }),
  ]);

  const favoriIdler =
    kullanici?.bildirimFavoriDuyuru === false ? [] : favoriIsletmeIdleri.map((f) => f.businessId);
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
    ...rezervasyonlar.map((r): BildirimOgesi => {
      const saat = r.baslangic.toLocaleString("tr-TR", {
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      });
      return {
        id: `rezervasyon-${r.id}-${r.durum}`,
        tur: "rezervasyon",
        tarih: r.updatedAt.toISOString(),
        baslik:
          r.durum === "onaylandi"
            ? `Rezervasyonun onaylandı: ${r.business.name}`
            : `Rezervasyonun iptal edildi: ${r.business.name}`,
        aciklama: saat,
        href: "/rezervasyonlarim",
      };
    }),
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
