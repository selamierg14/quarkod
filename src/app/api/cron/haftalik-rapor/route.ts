import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { haftalikRaporGonder } from "@/lib/haftalik-rapor";
import { cronCalistir, cronYetkiliMi } from "@/lib/cron";

export const dynamic = "force-dynamic";

/**
 * Haftalık özet e-postasını gönderir.
 *
 * `scripts/haftalik-rapor.ts` ile aynı iş (bkz. src/lib/haftalik-rapor.ts) —
 * o script gerçek bir crontab'ı olan bir sunucu varsayıyor, uygulama ise
 * Vercel'de serverless çalışıyor. Vercel Cron bu uca haftada bir istek
 * atacak şekilde vercel.json'da tanımlı; zamanlanmadıysa (ya da CRON_SECRET
 * tanımlı değilse) kimse bu uca erişemez, rapor da hiç gitmez — panelde
 * "Sistem sağlığı" bunu görünür kılar.
 */
export async function GET(request: Request) {
  if (!cronYetkiliMi(request)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { ok, detay } = await cronCalistir("haftalik-rapor", () =>
    haftalikRaporGonder(prisma),
  );

  return NextResponse.json({ ok, detay }, { status: ok ? 200 : 500 });
}
