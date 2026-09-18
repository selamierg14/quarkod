#!/usr/bin/env node
/**
 * Üretim bağımlılıklarının güvenlik taraması — BİLİNEN İSTİSNALAR DIŞINDA
 * BLOKLAR.
 *
 * NEDEN DÜZ `npm audit` YETMEDİ. CI'daki adım `continue-on-error: true` ile
 * duruyordu ve bunun o an geçerli bir gerekçesi vardı: açık kalan dört
 * uyarının tamamı Prisma'nın kendi derleme zamanı bağımlılıklarındandı ve
 * npm'in önerdiği "düzeltme" Prisma'yı bir ana sürüm DÜŞÜRMEKTİ. Bloklayan
 * bir adım ilk günden kırmızı olur, kimse bakmaz hâle gelirdi.
 *
 * Ama bloklamayan bir adımın da bir bedeli var ve o bedel görüldü:
 * araya Next.js'te KİMLİK DOĞRULAMASI GEREKTİRMEYEN bir uzaktan kod
 * çalıştırma (RCE) uyarısı düştü, CI yeşil kalmaya devam etti ve kimse fark
 * etmedi. Düzeltmesi yalnızca bir yama sürümüydü (16.3.0 → 16.3.4).
 *
 * Bu betik ikisinin ortasını tutuyor: kabul edilmiş uyarılar SUSUYOR, geri
 * kalan HER ŞEY CI'yı kırıyor. Yani "gürültü yüzünden kimse bakmıyor"
 * sorunu da, "kritik uyarı sessizce geçti" sorunu da ortadan kalkıyor.
 *
 * Kabul listesine bir satır eklemek bilinçli bir karar olmalı: paket adı
 * yetmiyor, GEREKÇE ve NEDEN ERİŞİLEMEZ olduğu da yazılmak zorunda.
 */

import { execFileSync } from "node:child_process";

/**
 * Kabul edilen uyarılar — her biri gerekçesiyle.
 *
 * Buradaki hepsi Prisma 7'nin KENDİ derleme zamanı ağacından geliyor ve
 * npm'in önerdiği tek "düzeltme" Prisma'yı 6'ya düşürmek. İkisi de bu
 * projede saldırgan girdisine erişemiyor.
 */
const KABUL = {
  prisma:
    "Doğrudan bağımlılık ama uyarı kendi alt ağacından (@prisma/config, " +
    "mysql2) geliyor; npm'in önerdiği düzeltme ana sürüm düşürmek.",
  "@prisma/config":
    "Yalnızca kendi prisma.config dosyamızı okuyup birleştiriyor — " +
    "saldırganın etkileyebildiği bir girdi yolu yok.",
  "deepmerge-ts":
    "@prisma/config'in yapılandırma birleştiricisi. Girdisi bizim " +
    "yapılandırma dosyamız; özyinelemeli nesne grafiği dışarıdan gelmiyor.",
  mysql2:
    "Prisma'nın MySQL sürücüsü. Bu proje PostgreSQL kullanıyor; paket hiç " +
    "örneklenmiyor, protokol koduna hiçbir bayt ulaşmıyor.",
};

function tara() {
  try {
    // `npm audit` bulgu varken sıfırdan farklı çıkıyor; çıktı yine JSON.
    const cikti = execFileSync("npm", ["audit", "--omit=dev", "--json"], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    return JSON.parse(cikti);
  } catch (hata) {
    if (hata.stdout) return JSON.parse(hata.stdout);
    throw hata;
  }
}

const rapor = tara();
const uyarilar = Object.values(rapor.vulnerabilities ?? {});

const kabulEdilen = [];
const yeni = [];
for (const u of uyarilar) {
  // Bilgilendirme ve düşük seviyeyi bloklamıyoruz; asıl mesele yüksek ve
  // üstü. Orta seviye listelenip geçiliyor.
  const onemli = u.severity === "high" || u.severity === "critical";
  if (!onemli) continue;
  (KABUL[u.name] ? kabulEdilen : yeni).push(u);
}

const baslikla = (u) =>
  u.via
    .filter((v) => typeof v === "object")
    .map((v) => `      → ${v.title}`)
    .join("\n");

if (kabulEdilen.length > 0) {
  console.log(`Kabul edilmiş uyarılar (${kabulEdilen.length}) — bloklamıyor:`);
  for (const u of kabulEdilen) {
    console.log(`  · ${u.name} [${u.severity}]`);
    console.log(`      gerekçe: ${KABUL[u.name]}`);
  }
  console.log("");
}

if (yeni.length === 0) {
  console.log("✓ Kabul listesi dışında yüksek/kritik uyarı yok.");
  process.exit(0);
}

console.error(`✗ ${yeni.length} YENİ yüksek/kritik uyarı — CI kırılıyor:\n`);
for (const u of yeni) {
  const duzeltme =
    u.fixAvailable === true
      ? "uyumlu bir sürüm var (npm audit fix)"
      : u.fixAvailable
        ? `${u.fixAvailable.name}@${u.fixAvailable.version}` +
          (u.fixAvailable.isSemVerMajor ? " (ANA SÜRÜM — kırıcı olabilir)" : " (uyumlu)")
        : "yok";
  console.error(`  · ${u.name} [${u.severity}]  aralık: ${u.range}`);
  console.error(`      düzeltme: ${duzeltme}`);
  const basliklar = baslikla(u);
  if (basliklar) console.error(basliklar);
}
console.error(
  "\nYa paketi yükseltin, ya da erişilemez olduğunu GEREKÇELENDİRİP\n" +
    "scripts/bagimlilik-taramasi.mjs içindeki KABUL listesine ekleyin.",
);
process.exit(1);
