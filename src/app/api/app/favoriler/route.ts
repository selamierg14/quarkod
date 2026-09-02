import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { gorselAdresi } from "@/lib/gorsel-adres";
import { apiHata, appKullaniciGerekli, govdeOku } from "@/lib/app-api";

export const dynamic = "force-dynamic";

/** Kullanıcının favorilediği mekanlar. */
export async function GET(request: Request) {
  const oturum = await appKullaniciGerekli(request);
  if ("yanit" in oturum) return oturum.yanit;

  const favoriler = await prisma.appFavorite.findMany({
    where: { appUserId: oturum.kullanici.id },
    orderBy: { createdAt: "desc" },
    select: {
      businessId: true,
      business: { select: { id: true, slug: true, name: true, logoUrl: true, brandColor: true } },
    },
  });

  return NextResponse.json({
    mekanlar: favoriler.map((f) => ({
      id: f.business.id,
      slug: f.business.slug,
      ad: f.business.name,
      logoUrl: gorselAdresi(f.business.id, "logo", f.business.logoUrl),
      markaRengi: f.business.brandColor,
    })),
  });
}

/**
 * Favoriyi açar/kapatır (toggle) — istemcinin önce "favori mi değil mi"
 * diye sorup sonra ayrı bir ekle/çıkar isteği atmasına gerek kalmasın diye
 * tek uç. Aynı butona basıp bırakmak en yaygın kullanım.
 */
export async function POST(request: Request) {
  const oturum = await appKullaniciGerekli(request);
  if ("yanit" in oturum) return oturum.yanit;

  const govde = await govdeOku(request);
  const businessId = typeof govde?.businessId === "string" ? govde.businessId : "";
  if (!businessId) return apiHata("Mekan bilgisi eksik.", 400);

  const mekan = await prisma.business.findUnique({ where: { id: businessId }, select: { id: true } });
  if (!mekan) return apiHata("Mekan bulunamadı.", 404);

  const mevcut = await prisma.appFavorite.findUnique({
    where: { appUserId_businessId: { appUserId: oturum.kullanici.id, businessId } },
  });

  if (mevcut) {
    await prisma.appFavorite.delete({ where: { id: mevcut.id } });
    return NextResponse.json({ favoriMi: false });
  }

  await prisma.appFavorite.create({ data: { appUserId: oturum.kullanici.id, businessId } });
  return NextResponse.json({ favoriMi: true });
}
