import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiHata, appKullaniciGerekli, govdeOku, metin } from "@/lib/app-api";
import { gecerliExpoJetonuMu } from "@/lib/app-push";

export const dynamic = "force-dynamic";

/**
 * Cihazın bildirim jetonunu kaydeder / siler.
 *
 * POST  → jetonu kaydet (izin verildi)
 * DELETE → jetonu kapat (kullanıcı bildirimleri kapattı)
 *
 * Jeton CİHAZA ait, kullanıcıya değil: aynı telefonda hesap değiştiren
 * biri olursa jeton yeni kullanıcıya taşınmalı, yoksa bildirimler eski
 * hesabın adına gitmeye devam eder. Bu yüzden kayıt `expoToken`
 * üzerinden upsert ediliyor, `appUserId` üzerinden değil.
 */
export async function POST(request: Request) {
  const oturum = await appKullaniciGerekli(request);
  if ("yanit" in oturum) return oturum.yanit;

  const govde = await govdeOku(request);
  if (!govde) return apiHata("Geçersiz istek gövdesi.", 400);

  const jeton = metin(govde, "jeton");
  if (!gecerliExpoJetonuMu(jeton)) return apiHata("Geçersiz bildirim jetonu.", 400);

  const platform = metin(govde, "platform");

  await prisma.appPushSubscription.upsert({
    where: { expoToken: jeton },
    create: {
      appUserId: oturum.kullanici.id,
      expoToken: jeton,
      platform: platform || null,
    },
    // Yeniden izin verildiğinde kayıt canlanıyor: `disabledAt`
    // temizlenmezse kullanıcı bildirimi açsa da hiçbir şey almaz.
    update: {
      appUserId: oturum.kullanici.id,
      platform: platform || null,
      disabledAt: null,
      disabledReason: null,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const oturum = await appKullaniciGerekli(request);
  if ("yanit" in oturum) return oturum.yanit;

  const govde = await govdeOku(request);
  const jeton = govde ? metin(govde, "jeton") : "";

  // Jeton verilmişse yalnızca o cihaz, verilmemişse kullanıcının tüm
  // cihazları susturuluyor ("tüm cihazlarda kapat" davranışı).
  await prisma.appPushSubscription.updateMany({
    where: jeton
      ? { expoToken: jeton, appUserId: oturum.kullanici.id }
      : { appUserId: oturum.kullanici.id },
    data: { disabledAt: new Date(), disabledReason: "kullanici" },
  });

  return NextResponse.json({ ok: true });
}
