import "dotenv/config";
import { createHash } from "crypto";
import { readdirSync } from "fs";
import { join } from "path";
import { createScriptClient } from "./prisma-client";

/**
 * Demo mekanlara kapak fotoğrafı dağıtır.
 *
 *   npm run demo:gorsel
 *
 * Biyerlere'nin bütün yüzü mekan kartlarından oluşuyor ama demo verisinde
 * 52 mekanın 51'inde kapak görseli yoktu: kartlar fotoğraf bulamayınca
 * marka renginden gradyana düşüyor ve uygulama "renkli dikdörtgen tarlası"
 * gibi görünüyordu. Uygulamayı gerçekten değerlendirebilmek için önce bu
 * boşluğun dolması gerekiyor.
 *
 * Fotoğraflar `public/mekan-gorselleri/` altında duruyor ve `coverUrl`'e
 * data URI değil, bu dosyaların yolu yazılıyor — gerekçe için bkz.
 * lib/gorsel-adres.ts. Panelden yüklenen gerçek görseller data URI olmaya
 * devam ediyor.
 *
 * Eşleştirme İSMİN ÖZETİNDEN türetiliyor, rastgele değil: betik ikinci kez
 * çalıştığında aynı mekan aynı fotoğrafı alıyor, yani liste her deploy'da
 * yeniden karılmıyor.
 *
 * Idempotent ve KORUMALI: kapağı zaten olan mekana dokunmuyor, yani
 * panelden yüklenmiş gerçek bir görselin üzerine yazmıyor.
 */

const KLASOR = "mekan-gorselleri";

/** Mekan türü → dosya adı öneki. */
const TUR_ONEKI: Record<string, string> = {
  yeme_icme: "kafe",
  balikci: "balik",
  gece_kulubu: "bar",
};

function dosyalariOku(): Record<string, string[]> {
  const kok = join(process.cwd(), "public", KLASOR);
  const gruplar: Record<string, string[]> = {};
  for (const ad of readdirSync(kok)) {
    if (!ad.endsWith(".jpg")) continue;
    const onek = ad.split("-")[0];
    (gruplar[onek] ??= []).push(ad);
  }
  for (const liste of Object.values(gruplar)) liste.sort();
  return gruplar;
}

/** Mekan kimliğinden sabit bir indis — aynı mekan hep aynı fotoğrafı alır. */
function sabitIndis(anahtar: string, uzunluk: number): number {
  const ozet = createHash("sha256").update(anahtar).digest();
  return ozet.readUInt32BE(0) % uzunluk;
}

async function main() {
  const prisma = createScriptClient();

  try {
    const gruplar = dosyalariOku();
    const toplamDosya = Object.values(gruplar).reduce((t, l) => t + l.length, 0);
    if (toplamDosya === 0) {
      throw new Error(`public/${KLASOR} boş — önce fotoğrafları ekleyin.`);
    }

    // Yalnızca Biyerlere'de görünen (konumu olan) demo mekanlar.
    const mekanlar = await prisma.business.findMany({
      where: { latitude: { not: null }, coverUrl: null },
      select: { id: true, name: true, type: true },
      orderBy: { name: "asc" },
    });

    let atanan = 0;
    const kullanim = new Map<string, number>();

    for (const mekan of mekanlar) {
      const onek = TUR_ONEKI[mekan.type ?? ""] ?? "kafe";
      const havuz = gruplar[onek] ?? gruplar.kafe;
      if (!havuz || havuz.length === 0) continue;

      const dosya = havuz[sabitIndis(mekan.id, havuz.length)];
      await prisma.business.update({
        where: { id: mekan.id },
        data: { coverUrl: `/${KLASOR}/${dosya}` },
      });
      kullanim.set(dosya, (kullanim.get(dosya) ?? 0) + 1);
      atanan += 1;
    }

    const enCok = [...kullanim.values()].reduce((a, b) => Math.max(a, b), 0);
    console.log(
      `${atanan} mekana kapak atandı (${toplamDosya} fotoğraf, en çok tekrarlanan ${enCok} kez).`,
    );
    if (atanan === 0) {
      console.log("Kapağı olmayan mekan kalmamış — yapılacak bir şey yok.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
