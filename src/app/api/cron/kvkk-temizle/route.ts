import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CONTACT_RETENTION_DAYS } from "@/lib/kvkk";
import { cronCalistir, cronYetkiliMi } from "@/lib/cron";

export const dynamic = "force-dynamic";

/**
 * Saklama süresi dolan iletişim bilgilerini/fotoğrafları siler.
 *
 * `scripts/kvkk-temizle.ts` ile aynı iş — o script bir sunucuda çalışan
 * gerçek bir crontab varsayıyor. Vercel serverless'te crontab yok; bu route
 * aynı işi Vercel Cron'un tetikleyebileceği bir uç olarak sunuyor
 * (bkz. vercel.json). Zamanlanmadıysa (ya da CRON_SECRET tanımlı değilse)
 * kimse bu uca erişemez, iş de hiç çalışmaz — panelde "Sistem sağlığı"
 * bunu "Hiç çalışmadı" olarak gösterir.
 */
export async function GET(request: Request) {
  if (!cronYetkiliMi(request)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { ok, detay } = await cronCalistir("kvkk-temizle", async () => {
    const cutoff = new Date(Date.now() - CONTACT_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    // Fotoğraf da kişisel veri sayılabilir (kare içinde insan olabilir) ve
    // aynı süre sözüne tabi; iletişim bilgisiyle birlikte siliniyor.
    const stale = await prisma.feedback.findMany({
      where: {
        createdAt: { lt: cutoff },
        OR: [{ contactInfo: { not: null } }, { photoUrl: { not: null } }],
      },
      select: { id: true },
    });

    if (stale.length === 0) return "Silinecek kayıt yok.";

    const result = await prisma.feedback.updateMany({
      where: { id: { in: stale.map((f) => f.id) } },
      data: {
        contactInfo: null,
        contactType: null,
        photoUrl: null,
        contactErasedAt: new Date(),
      },
    });

    return `${result.count} kayıt temizlendi.`;
  });

  return NextResponse.json({ ok, detay }, { status: ok ? 200 : 500 });
}
