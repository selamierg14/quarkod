import "dotenv/config";
import { isiCalistir } from "./is-kaydi";
import fs from "node:fs";
import path from "node:path";
import { createScriptClient } from "./prisma-client";

/**
 * Veritabanının tutarlı bir kopyasını alır.
 *
 * `VACUUM INTO` yazma sırasında da güvenli bir anlık görüntü üretir — dosyayı
 * `cp` ile kopyalamak, o an bir yazma varsa bozuk yedek verebilir.
 *
 * Günde bir kez çalıştırın:
 *   npm run yedekle
 *
 * Yedekler proje içindeki `yedekler/` klasörüne düşer. Gerçek koruma için bu
 * klasörü makine dışına da senkronlayın — aynı diskte duran yedek, disk
 * gittiğinde beraber gider.
 */
const KEEP = 14;

function stamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}`
  );
}

async function main() {
  const dir = path.join(process.cwd(), "yedekler");
  fs.mkdirSync(dir, { recursive: true });

  const target = path.join(dir, `dev-${stamp(new Date())}.db`);
  if (fs.existsSync(target)) {
    console.log(`Bu dakika için yedek zaten var: ${path.basename(target)}`);
    return;
  }

  const prisma = createScriptClient();
  try {
    // Yol tek tırnak içinde geçtiği için kaçış gerekiyor.
    await prisma.$executeRawUnsafe(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
  } finally {
    await prisma.$disconnect();
  }

  const size = (fs.statSync(target).size / 1024).toFixed(0);
  console.log(`Yedek alındı: yedekler/${path.basename(target)} (${size} KB)`);

  const eskiler = fs
    .readdirSync(dir)
    .filter((name) => name.startsWith("dev-") && name.endsWith(".db"))
    .sort()
    .reverse()
    .slice(KEEP);

  for (const name of eskiler) {
    fs.unlinkSync(path.join(dir, name));
  }
  if (eskiler.length > 0) {
    console.log(`${eskiler.length} eski yedek silindi (son ${KEEP} tanesi tutulur).`);
  }
}

// Çalışma kaydı tutuluyor: "cron'a bağlamayı unuttuk" durumu panelde
// "Hiç çalışmadı" olarak görünsün.
void isiCalistir("yedekle", main);
