import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { gunBaslangici } from "@/lib/gun";
import { PLUS_HEDIYE_ACIKLAMASI, PLUS_KUPON_ONEKI } from "@/lib/biyerlere-plus";
import { apiHata, appKullaniciGerekli, govdeOku } from "@/lib/app-api";

export const dynamic = "force-dynamic";

/**
 * Biyerlere Plus üyesinin günlük ücretsiz kahve hakkını kullanması.
 *
 * Üç şart birden: (1) üye GEÇERLİ Plus üyesi olmalı — `oturum.kullanici.
 * plusUyeMi` zaten bunu içeriyor (bkz. app-api.ts'teki plusGecerliMi
 * çağrısı: plusBitis geçmişse plusUyeMi=true olsa bile false döner),
 * (2) mekan Plus'a ortak olmalı (biyerlerePlusOrtagi), (3) bugün bu
 * mekanda henüz hak kullanılmamış olmalı — "günde bir" kuralı
 * PLUS_KUPON_ONEKI ile başlayan kuponun BUGÜNKÜ createdAt'ine bakılarak
 * uygulanıyor; ayrı bir sayaç tablosu açmaya gerek yok, kupon zaten bu
 * kaydı taşıyor.
 */
export async function POST(request: Request) {
  const oturum = await appKullaniciGerekli(request);
  if ("yanit" in oturum) return oturum.yanit;

  if (!oturum.kullanici.plusUyeMi) {
    return apiHata("Biyerlere Plus üyeliğin yok ya da süresi doldu.", 403);
  }

  const govde = await govdeOku(request);
  const businessId = typeof govde?.businessId === "string" ? govde.businessId : "";
  if (!businessId) return apiHata("Mekan bilgisi eksik.", 400);

  const mekan = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, name: true, biyerlerePlusOrtagi: true },
  });
  if (!mekan) return apiHata("Mekan bulunamadı.", 404);
  if (!mekan.biyerlerePlusOrtagi) {
    return apiHata("Bu mekan Biyerlere Plus'a ortak değil.", 409);
  }

  const bugununBaslangici = gunBaslangici();
  const bugunAlindiMi = await prisma.coupon.findFirst({
    where: {
      appUserId: oturum.kullanici.id,
      businessId: mekan.id,
      code: { startsWith: PLUS_KUPON_ONEKI },
      createdAt: { gte: bugununBaslangici },
    },
    select: { id: true },
  });
  if (bugunAlindiMi) {
    return apiHata("Bugün bu mekandan Plus hakkını zaten aldın. Yarın tekrar gel!", 409);
  }

  const kupon = await prisma.coupon.create({
    data: {
      businessId: mekan.id,
      appUserId: oturum.kullanici.id,
      code: `${PLUS_KUPON_ONEKI}${randomBytes(6).toString("hex")}`,
      discount: PLUS_HEDIYE_ACIKLAMASI,
      // Aynı gün kullanılmazsa düşer — "biriktirilebilir" bir hak değil,
      // günlük bir ayrıcalık.
      expiresAt: new Date(bugununBaslangici.getTime() + 24 * 60 * 60 * 1000),
    },
    select: { id: true, code: true, discount: true },
  });

  return NextResponse.json({ kupon }, { status: 201 });
}
