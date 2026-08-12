import "dotenv/config";
import { isiCalistir } from "./is-kaydi";
import { createScriptClient } from "./prisma-client";
import { CONTACT_RETENTION_DAYS } from "../src/lib/kvkk";

/**
 * Saklama süresi dolan iletişim bilgilerini siler.
 *
 * Anket ekranında müşteriye "en fazla X gün saklanır" sözü veriliyor; bu
 * script o sözü uygular. Günde bir kez çalıştırın (cron / launchd / Vercel Cron):
 *
 *   npm run kvkk:temizle
 *
 * Puan ve yorumlar silinmez — sadece kişiyi işaret eden alan boşaltılır ve
 * silme anı kayda yazılır ki panelde "süresi doldu" olarak görünsün.
 */
async function main() {
  const prisma = createScriptClient();
  const cutoff = new Date(Date.now() - CONTACT_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  try {
    // Fotoğraf da kişisel veri sayılabilir (kare içinde insan olabilir) ve
    // aynı süre sözüne tabi; iletişim bilgisiyle birlikte siliniyor.
    const stale = await prisma.feedback.findMany({
      where: {
        createdAt: { lt: cutoff },
        OR: [{ contactInfo: { not: null } }, { photoUrl: { not: null } }],
      },
      select: { id: true },
    });

    if (stale.length === 0) {
      console.log(
        `Saklama süresi (${CONTACT_RETENTION_DAYS} gün) dolan iletişim bilgisi/fotoğraf yok.`,
      );
      return "Silinecek kayıt yok.";
    }

    const result = await prisma.feedback.updateMany({
      where: { id: { in: stale.map((f) => f.id) } },
      data: {
        contactInfo: null,
        contactType: null,
        photoUrl: null,
        contactErasedAt: new Date(),
      },
    });

    console.log(`${result.count} kaydın iletişim bilgisi ve fotoğrafı silindi.`);
    return `${result.count} kayıt temizlendi.`;
  } finally {
    await prisma.$disconnect();
  }
}

// Çalışma kaydı tutuluyor: "cron'a bağlamayı unuttuk" durumu panelde
// "Hiç çalışmadı" olarak görünsün.
void isiCalistir("kvkk-temizle", main);
