import "dotenv/config";
import { spawnSync } from "node:child_process";

/**
 * Günlük bakım işlerinin tek girişi.
 *
 * Cron'a üç ayrı satır yazmak yerine tek satır yeter:
 *
 *   0 4 * * *  cd /uygulama/dizini && npm run isler:gunluk >> /var/log/mm.log 2>&1
 *
 * Her iş ayrı süreçte çalışır: biri patlarsa diğerleri yine çalışsın.
 * Haftalık rapor yalnızca istenen günde gönderilir (varsayılan pazartesi),
 * böylece aynı cron satırı haftalık işi de taşıyabiliyor.
 */

const RAPOR_GUNU = Number(process.env.HAFTALIK_RAPOR_GUNU ?? "1"); // 1 = pazartesi

type Is = { ad: string; dosya: string; atla?: () => boolean };

const ISLER: Is[] = [
  { ad: "KVKK temizliği", dosya: "scripts/kvkk-temizle.ts" },
  { ad: "Yedekleme", dosya: "scripts/yedekle.ts" },
  {
    ad: "Haftalık rapor",
    dosya: "scripts/haftalik-rapor.ts",
    atla: () => new Date().getDay() !== RAPOR_GUNU,
  },
];

let hata = 0;

for (const is of ISLER) {
  if (is.atla?.()) {
    console.log(`— ${is.ad}: bugün sırası değil, atlandı.`);
    continue;
  }

  console.log(`▶ ${is.ad}`);
  const sonuc = spawnSync("npx", ["tsx", is.dosya], {
    stdio: "inherit",
    env: process.env,
  });

  if (sonuc.status !== 0) {
    hata += 1;
    console.error(`✖ ${is.ad} hata verdi (çıkış kodu ${sonuc.status}).`);
  }
}

// Cron çıktısını izleyen taraf için: sıfırdan farklı çıkış kodu "ilgilen" demek.
process.exit(hata > 0 ? 1 : 0);
