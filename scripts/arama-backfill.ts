import "dotenv/config";
import { createScriptClient } from "./prisma-client";
import { foldTr } from "../src/lib/text";

/**
 * commentSearch alanı sonradan eklendiği için eski kayıtlarda boş. Bu script
 * onları doldurur. Bir kez çalıştırmak yeterli:
 *
 *   npm run arama:backfill
 */
async function main() {
  const prisma = createScriptClient();

  try {
    const rows = await prisma.feedback.findMany({
      where: { comment: { not: null }, commentSearch: null },
      select: { id: true, comment: true },
    });

    if (rows.length === 0) {
      console.log("Doldurulacak kayıt yok.");
      return;
    }

    for (const row of rows) {
      await prisma.feedback.update({
        where: { id: row.id },
        data: { commentSearch: foldTr(row.comment ?? "") },
      });
    }

    console.log(`${rows.length} kaydın arama alanı dolduruldu.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
