import "dotenv/config";
import { createScriptClient } from "./prisma-client";

/**
 * Test için örnek menü ve ürün puanları.
 *
 * Ürün raporunun gerçekten işe yaradığını görmek için puanların dağılımı
 * kasten dengesiz: bir tatlı belirgin şekilde kötü, bir kahve belirgin
 * şekilde iyi, bir ürün de "az veri" eşiğinin altında.
 */

const MENU = [
  {
    bolum: "Kahveler",
    urunler: [
      { name: "Türk Kahvesi", price: 8500, tags: "populer", puanlar: [5, 5, 4, 5, 5, 4, 5] },
      { name: "Filtre Kahve", price: 9000, tags: null, puanlar: [4, 4, 5, 3, 4, 4] },
      { name: "Latte", price: 11000, tags: "populer", puanlar: [5, 4, 4, 5, 5, 4, 5, 4] },
      { name: "Soğuk Kahve", price: 12000, tags: "yeni", puanlar: [4, 3] },
    ],
  },
  {
    bolum: "Tatlılar",
    urunler: [
      { name: "Cheesecake", price: 16500, tags: null, puanlar: [2, 1, 2, 3, 2, 1] },
      { name: "Sufle", price: 17500, tags: "populer", puanlar: [5, 5, 4, 5, 5] },
      { name: "Vegan Brownie", price: 15000, tags: "vegan,glutensiz", puanlar: [4, 4, 5] },
    ],
  },
  {
    bolum: "Atıştırmalıklar",
    urunler: [
      { name: "Tost", price: 13000, tags: null, puanlar: [3, 4, 3, 3, 4, 3] },
      { name: "Acılı Wrap", price: 19000, tags: "aci", puanlar: [4, 5, 4, 4, 3] },
      { name: "Mevsim Salata", price: 18000, tags: "vejetaryen,glutensiz", puanlar: [4, 4] },
    ],
  },
];

async function main() {
  const prisma = createScriptClient();

  const business = await prisma.business.findFirst({
    where: { slug: "ege-cunda-balik" },
    include: { account: true },
  });
  if (!business) throw new Error("Örnek işletme bulunamadı. Önce npm run setup çalıştırın.");

  // Modül kapalıyken menü hiç görünmez; demo için açıyoruz.
  await prisma.account.update({
    where: { id: business.accountId },
    data: { menuEnabled: true },
  });

  await prisma.itemRating.deleteMany({ where: { businessId: business.id } });
  await prisma.menuCategory.deleteMany({ where: { businessId: business.id } });

  // Puanları bir geri bildirime bağlamak gerekiyor (kanıt zinciri); demoda
  // hepsini tek bir örnek geri bildirime bağlamak yerine ürün başına ayrı
  // kayıt açıyoruz ki "aynı ankette aynı ürün iki kez" kuralı ihlal olmasın.
  let sira = 0;
  let toplamPuan = 0;

  for (const bolum of MENU) {
    sira += 10;
    const kategori = await prisma.menuCategory.create({
      data: { businessId: business.id, name: bolum.bolum, sortOrder: sira },
    });

    let urunSira = 0;
    for (const urun of bolum.urunler) {
      urunSira += 10;
      const kayit = await prisma.menuItem.create({
        data: {
          businessId: business.id,
          categoryId: kategori.id,
          name: urun.name,
          priceKurus: urun.price,
          tags: urun.tags,
          sortOrder: urunSira,
          // Bir ürünü tükendi bırakalım: menüde nasıl göründüğü test edilsin.
          soldOut: urun.name === "Soğuk Kahve",
        },
      });

      for (const puan of urun.puanlar) {
        const feedback = await prisma.feedback.create({
          data: {
            businessId: business.id,
            overallRating: Math.min(5, Math.max(1, puan)),
            shift: "aksam",
          },
        });
        await prisma.itemRating.create({
          data: {
            feedbackId: feedback.id,
            businessId: business.id,
            menuItemId: kayit.id,
            itemName: kayit.name,
            rating: puan,
          },
        });
        toplamPuan += 1;
      }
    }
  }

  console.log(`Menü kuruldu: ${MENU.length} bölüm, ${toplamPuan} ürün puanı.`);
  console.log(`Müşteri ekranı: /f/${business.slug}/17`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
