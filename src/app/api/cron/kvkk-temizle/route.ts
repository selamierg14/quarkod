import { NextResponse } from "next/server";
import { prisma } from "@/lib/cekirdek/db";
import { CONTACT_RETENTION_DAYS } from "@/lib/isletme/kvkk";
import { cronCalistir, cronYetkiliMi } from "@/lib/altyapi/cron";
import { pruneLoginAttempts } from "@/lib/kimlik/login-guard";
import { eskiIptalleriTemizle } from "@/lib/kimlik/jeton-iptal";

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

    // Sayaç tablosunun günlük budaması da buraya bağlı. Önceden yalnızca
    // PANEL GİRİŞİNDE tetikleniyordu; oysa aynı tabloya artık hız sınırı da
    // yazıyor (kayıt, ziyaret, metrik uçları — bkz. lib/kimlik/hiz-siniri.ts).
    // Panele kimse girmediği bir haftada tablo sınırsız büyüyordu.
    const budanan = await pruneLoginAttempts().catch(() => 0);
    // Süresi dolmuş jetonların iptal kayıtları: jeton zaten geçersiz,
    // satırın işi bitti.
    const iptal = await eskiIptalleriTemizle().catch(() => 0);

    return `${result.count} kayıt temizlendi, ${budanan ?? 0} eski sayaç satırı, ${iptal} eski jeton iptali budandı.`;
  });

  return NextResponse.json({ ok, detay }, { status: ok ? 200 : 500 });
}
