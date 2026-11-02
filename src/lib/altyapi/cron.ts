import "server-only";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "../cekirdek/db";

/**
 * Vercel Cron gibi tetikleyicilerin bu route'u çağırdığından emin olmak için.
 *
 * Vercel, proje ayarlarına CRON_SECRET eklenmişse kendi cron isteklerine
 * otomatik olarak `Authorization: Bearer $CRON_SECRET` başlığı ekliyor. Secret
 * tanımlı değilse route'u kapalı sayıyoruz — sırf var olmasıyla tetiklenebilir
 * bir uç, herkese açık bir "veriyi sil" düğmesi demek olurdu.
 */
export function cronYetkiliMi(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const gelen = Buffer.from(request.headers.get("authorization") ?? "");
  const beklenen = Buffer.from(`Bearer ${secret}`);
  /**
   * SABİT SÜRELİ karşılaştırma. `===` ilk farklı karakterde durur; yanıt
   * süresindeki fark, anahtarın kaç karakterinin doğru tahmin edildiğini
   * ölçmeye izin verir. Uzunluk farkı ayrıca kontrol ediliyor çünkü
   * `timingSafeEqual` eşit uzunluk istiyor.
   */
  return gelen.length === beklenen.length && timingSafeEqual(gelen, beklenen);
}

/**
 * Bir işi çalıştırır ve JobRun'a kaydeder — script'lerdeki isiCalistir'in
 * route'a uygun hâli. process.exit çağırmaz (serverless fonksiyonda bunu
 * yapmak istemeyiz) ve script'lerin ayrı Prisma istemcisi yerine uygulamanın
 * paylaşılan `prisma`'sını kullanır.
 */
export async function cronCalistir(
  ad: string,
  calistir: () => Promise<string | void>,
): Promise<{ ok: boolean; detay: string | null }> {
  const kayit = await prisma.jobRun.create({ data: { name: ad } }).catch(() => null);

  try {
    const detay = (await calistir()) ?? null;
    if (kayit) {
      await prisma.jobRun.update({
        where: { id: kayit.id },
        data: { finishedAt: new Date(), ok: true, detail: detay },
      });
    }
    return { ok: true, detay };
  } catch (error) {
    const mesaj = error instanceof Error ? error.message : String(error);
    if (kayit) {
      await prisma.jobRun
        .update({
          where: { id: kayit.id },
          data: { finishedAt: new Date(), ok: false, detail: mesaj.slice(0, 500) },
        })
        .catch(() => {});
    }
    return { ok: false, detay: mesaj };
  }
}
