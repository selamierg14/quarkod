import "dotenv/config";
import { isiCalistir } from "./is-kaydi";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";

const execFileAsync = promisify(execFile);

/**
 * Veritabanının tutarlı bir kopyasını alır.
 *
 * `pg_dump --format=custom` tek bir dosyaya, sıkıştırılmış ve seçmeli geri
 * yüklemeye uygun bir anlık görüntü üretir. Geri yüklemek için:
 *   pg_restore --clean --if-exists -d "$DATABASE_URL" yedekler/dosya.dump
 *
 * `pg_dump` Postgres istemci araçlarıyla gelir (`postgresql-client` paketi ya
 * da macOS'ta `brew install libpq`). Sunucuda kurulu değilse bu script hata
 * verir — yönetilen bir Postgres kullanıyorsanız (Neon, Supabase, RDS)
 * sağlayıcının kendi otomatik yedeklemesi zaten var; bu script'i ona ek
 * güvence olarak düşünün.
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
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL tanımlı değil.");

  const dir = path.join(process.cwd(), "yedekler");
  fs.mkdirSync(dir, { recursive: true });

  const target = path.join(dir, `yedek-${stamp(new Date())}.dump`);
  if (fs.existsSync(target)) {
    console.log(`Bu dakika için yedek zaten var: ${path.basename(target)}`);
    return;
  }

  try {
    await execFileAsync("pg_dump", [
      url,
      "--format=custom",
      "--no-owner",
      "--no-privileges",
      "--file",
      target,
    ]);
  } catch (error) {
    const mesaj = error instanceof Error ? error.message : String(error);
    if (/command not found|ENOENT/i.test(mesaj)) {
      throw new Error(
        "pg_dump bulunamadı. Postgres istemci araçlarını kurun " +
          "(Debian/Ubuntu: apt install postgresql-client, macOS: brew install libpq).",
      );
    }
    throw error;
  }

  const size = (fs.statSync(target).size / 1024).toFixed(0);
  console.log(`Yedek alındı: yedekler/${path.basename(target)} (${size} KB)`);

  const eskiler = fs
    .readdirSync(dir)
    .filter((name) => name.startsWith("yedek-") && name.endsWith(".dump"))
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
