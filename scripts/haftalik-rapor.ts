import "dotenv/config";
import { isiCalistir } from "./is-kaydi";
import { createScriptClient } from "./prisma-client";
import { haftalikRaporGonder } from "../src/lib/haftalik-rapor";

/**
 * Haftalık özet raporu. Pazartesi sabahı cron ile çalıştırın:
 *   npm run rapor:haftalik
 *
 * Vercel'e dağıtılmış kurulumlarda bunun yerine Vercel Cron'un tetiklediği
 * /api/cron/haftalik-rapor kullanılır (bkz. vercel.json); bu script gerçek
 * bir crontab'ı olan sunucular içindir. Asıl hesaplama ve gönderim mantığı
 * ikisi de aynı kod yolunu (src/lib/haftalik-rapor.ts) kullansın diye
 * paylaşılıyor.
 */
async function main() {
  const prisma = createScriptClient();
  try {
    const sonuc = await haftalikRaporGonder(prisma);
    console.log(`Haftalık rapor: ${sonuc}`);
    return sonuc;
  } finally {
    await prisma.$disconnect();
  }
}

// Çalışma kaydı tutuluyor: "cron'a bağlamayı unuttuk" durumu panelde
// "Hiç çalışmadı" olarak görünsün.
void isiCalistir("haftalik-rapor", main);
