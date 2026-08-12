import { createScriptClient } from "./prisma-client";

/**
 * Bir zamanlanmış işi çalıştırır ve sonucunu kaydeder.
 *
 * Kayıt olmadan bu işlerin çalışıp çalışmadığı ancak sunucuya girip log
 * okuyarak anlaşılıyordu; artık panelde "Sistem sağlığı" kartında görünüyor.
 * Kayıt yazılamazsa iş yine de çalışır — izleme, işin kendisini engellememeli.
 */
export async function isiCalistir(
  ad: string,
  calistir: () => Promise<string | void>,
): Promise<void> {
  const prisma = createScriptClient();
  let kayitId: string | null = null;

  try {
    const kayit = await prisma.jobRun.create({ data: { name: ad } });
    kayitId = kayit.id;
  } catch (error) {
    console.error(`[is-kaydi] "${ad}" başlangıcı kaydedilemedi:`, error);
  }

  try {
    const detay = await calistir();
    if (kayitId) {
      await prisma.jobRun.update({
        where: { id: kayitId },
        data: { finishedAt: new Date(), ok: true, detail: detay ?? null },
      });
    }
    await prisma.$disconnect();
  } catch (error) {
    const mesaj = error instanceof Error ? error.message : String(error);
    if (kayitId) {
      await prisma.jobRun
        .update({
          where: { id: kayitId },
          data: { finishedAt: new Date(), ok: false, detail: mesaj.slice(0, 500) },
        })
        .catch(() => {});
    }
    await prisma.$disconnect().catch(() => {});
    console.error(error);
    process.exit(1);
  }
}
