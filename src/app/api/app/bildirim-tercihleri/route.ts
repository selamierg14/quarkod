import { NextResponse } from "next/server";
import { prisma } from "@/lib/cekirdek/db";
import { apiHata, appKullaniciGerekli, govdeOku } from "@/lib/kimlik/app-api";
import {
  tercihListesi,
  tercihleriBirlestir,
  type Tercihler,
} from "@/lib/biyerlere/bildirim-tercihi";

export const dynamic = "force-dynamic";

/**
 * Kategori bazlı bildirim tercihleri.
 *
 * GET → mevcut durum + arayüzün çizeceği metinler. Metinlerin sunucudan
 * gelmesi, yayındaki eski bir uygulama sürümünün yeni bir kategoriyi
 * (adıyla, açıklamasıyla) güncelleme beklemeden gösterebilmesini
 * sağlıyor — aksi halde yeni kategori sunucuda uygulanır ama kullanıcı
 * onu hiçbir yerde göremez ve kapatamazdı.
 *
 * PUT → kısmi güncelleme; yalnızca gönderilen anahtar değişir.
 */

const SECIM = {
  bildirimFirsat: true,
  bildirimFavoriDuyuru: true,
  bildirimRozet: true,
} as const;

function tercihlere(kayit: Record<keyof typeof SECIM, boolean>): Tercihler {
  return {
    firsat: kayit.bildirimFirsat,
    favoriDuyuru: kayit.bildirimFavoriDuyuru,
    rozet: kayit.bildirimRozet,
  };
}

export async function GET(request: Request) {
  const oturum = await appKullaniciGerekli(request);
  if ("yanit" in oturum) return oturum.yanit;

  const kayit = await prisma.appUser.findUnique({
    where: { id: oturum.kullanici.id },
    select: SECIM,
  });
  if (!kayit) return apiHata("Hesap bulunamadı.", 404);

  return NextResponse.json({ tercihler: tercihListesi(tercihlere(kayit)) });
}

export async function PUT(request: Request) {
  const oturum = await appKullaniciGerekli(request);
  if ("yanit" in oturum) return oturum.yanit;

  const govde = await govdeOku(request);
  if (!govde) return apiHata("İstek gövdesi okunamadı.", 400);

  const kayit = await prisma.appUser.findUnique({
    where: { id: oturum.kullanici.id },
    select: SECIM,
  });
  if (!kayit) return apiHata("Hesap bulunamadı.", 404);

  const yeni = tercihleriBirlestir(tercihlere(kayit), govde.tercihler);

  await prisma.appUser.update({
    where: { id: oturum.kullanici.id },
    data: {
      bildirimFirsat: yeni.firsat,
      bildirimFavoriDuyuru: yeni.favoriDuyuru,
      bildirimRozet: yeni.rozet,
    },
  });

  return NextResponse.json({ tercihler: tercihListesi(yeni) });
}
