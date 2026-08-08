import "dotenv/config";
import { createScriptClient } from "./prisma-client";
import { foldTr } from "../src/lib/text";
import { shiftFromDate } from "../src/lib/constants";

/**
 * Paneli dolu görmek için geçmişe yayılmış örnek geri bildirim üretir.
 *
 *   npm run demo:veri
 *
 * SADECE DENEME AMAÇLI. Gerçek kullanıma geçmeden önce `npm run db:reset`
 * ile hepsini silin — yoksa uydurma yorumlar gerçek raporlara karışır.
 * Ürettiği kayıtlar iç notta "[DEMO]" ile işaretlenir.
 */
const DAY = 24 * 60 * 60 * 1000;
const WEEKS = 12;

const YORUMLAR_IYI = [
  "Her şey çok güzeldi, teşekkürler.",
  "Personel çok ilgiliydi, tekrar geleceğiz.",
  "Lezzet harikaydı, tavsiye ederim.",
  "Servis hızlıydı, memnun kaldık.",
  "",
  "",
];

const YORUMLAR_KOTU = [
  "Servis çok yavaştı, uzun bekledik.",
  "Masalar temiz değildi.",
  "Fiyatlar yüksek geldi.",
  "Siparişimiz yanlış geldi.",
  "Garson ilgilenmedi.",
  "",
];

function rasgele<T>(liste: T[]): T {
  return liste[Math.floor(Math.random() * liste.length)];
}

function arada(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Puan dağılımı: gerçek hayatta 4-5 ağırlıklı, arada düşükler.
 * `egilim` değeri işletmenin genel kalitesini kaydırır (-1 ile +1).
 */
function puanUret(egilim: number): number {
  const taban = Math.random() + egilim * 0.25;
  if (taban > 0.72) return 5;
  if (taban > 0.42) return 4;
  if (taban > 0.22) return 3;
  if (taban > 0.08) return 2;
  return 1;
}

async function main() {
  const prisma = createScriptClient();

  try {
    const businesses = await prisma.business.findMany({
      include: {
        categories: { where: { active: true } },
        tables: { where: { active: true } },
      },
    });

    if (businesses.length === 0) {
      console.log("Önce `npm run setup` ile işletmeleri oluşturun.");
      return;
    }

    let toplam = 0;

    for (const [sira, business] of businesses.entries()) {
      if (business.tables.length === 0) continue;

      // Her işletmenin farklı bir seyri olsun ki grafikler birbirinin aynısı olmasın.
      const yon = [0.3, -0.2, 0.05][sira % 3];

      for (let hafta = WEEKS - 1; hafta >= 0; hafta -= 1) {
        // Zamanla iyileşen/kötüleşen bir eğilim: son haftalara doğru kayar.
        const egilim = yon * ((WEEKS - hafta) / WEEKS);
        const adet = arada(3, 9);

        for (let i = 0; i < adet; i += 1) {
          const tarih = new Date(
            Date.now() - hafta * 7 * DAY - arada(0, 6) * DAY - arada(0, 82800) * 1000,
          );
          const puan = puanUret(egilim);
          const table = rasgele(business.tables);

          const kategoriPuanlari: Record<string, number> = {};
          for (const kategori of business.categories) {
            // Kategori puanı genel puanın etrafında salınır.
            kategoriPuanlari[kategori.name] = Math.min(
              5,
              Math.max(1, puan + arada(-1, 1)),
            );
          }

          const yorum = puan >= 4 ? rasgele(YORUMLAR_IYI) : rasgele(YORUMLAR_KOTU);
          const googleGosterildi = puan === 5 && business.googleRedirect;

          await prisma.feedback.create({
            data: {
              businessId: business.id,
              tableId: table.id,
              overallRating: puan,
              categoryRatings: JSON.stringify(kategoriPuanlari),
              comment: yorum || null,
              commentSearch: yorum ? foldTr(yorum) : null,
              status: puan <= 3 && Math.random() > 0.5 ? "cozuldu" : "yeni",
              internalNote: "[DEMO] örnek veri",
              redirectedToGoogle: googleGosterildi,
              // Gösterilenlerin yaklaşık üçte biri gerçekten tıklıyor.
              googleClickedAt:
                googleGosterildi && Math.random() < 0.35 ? tarih : null,
              shift: shiftFromDate(tarih),
              createdAt: tarih,
            },
          });
          toplam += 1;
        }
      }
    }

    console.log(`${toplam} örnek geri bildirim üretildi (son ${WEEKS} haftaya yayıldı).`);
    console.log("Gerçek kullanıma geçerken `npm run db:reset` ile temizleyin.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
