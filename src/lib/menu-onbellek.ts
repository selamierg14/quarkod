import "server-only";
import { prisma } from "./db";

/**
 * QR menü içeriğinin okunması.
 *
 * Burada bir zamanlar `unstable_cache` vardı ve iki ayrı sebeple bozuktu:
 *
 * 1. Sonuç boş dönüyordu. Next 16 + Turbopack altında bu kullanım (her
 *    çağrıda yeniden kurulan, Prisma nesnesi döndüren bir sarmalayıcı)
 *    sessizce boş dizi veriyordu. Menü sayfası da boş listede notFound()
 *    attığı için müşteri, menüsü dolu bir işletmede bile "Bu karekod artık
 *    geçerli değil" ekranını görüyordu — yani QR menü modülü fiilen hiç
 *    çalışmıyordu.
 * 2. Geçersiz kılma hiç işlemiyordu. Panel tarafı `updateTag` çağırıyor ama
 *    `updateTag` yalnızca `fetch` etiketlerini ve `'use cache'` +
 *    `cacheTag` ile işaretlenmiş girdileri düşürüyor; `unstable_cache`
 *    etiketleri `revalidateTag` ister. Yani cache dolsaydı bile menü
 *    değişiklikleri müşteriye hiç yansımayacaktı.
 *
 * Şimdilik doğrudan okuyoruz: yanlış menü göstermektense fazladan sorgu
 * yapmak yeğdir. Sorgu ağır (ürün görselleri data URI olarak saklanıyor,
 * ürün başına ~250 KB'a çıkabiliyor), bu yüzden önbellek ileride geri
 * gelmeli — ama `'use cache'` + `cacheTag` ile, `updateTag`'in gerçekten
 * düşürebileceği biçimde.
 */

/** İşletme bazlı etiket: bir kafenin menüsü değişince yalnızca o düşer. */
export function menuEtiketi(businessId: string): string {
  return `menu:${businessId}`;
}

/** Menüde gösterilecek bölümler ve ürünler (tükenenler dahil, pasifler hariç). */
export function menuIcerigi(businessId: string) {
  return prisma.menuCategory.findMany({
    where: { businessId, active: true },
    orderBy: { sortOrder: "asc" },
    include: {
      // Tükenen ürün menüde kalır ama işaretli görünür: "vardı ama bugün
      // yok" bilgisi, ürünün hiç olmaması kadar değerli.
      items: { where: { active: true }, orderBy: { sortOrder: "asc" } },
    },
  });
}
