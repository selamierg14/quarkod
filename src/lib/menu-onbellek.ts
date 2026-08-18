import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "./db";

/**
 * QR menü içeriğinin önbelleği.
 *
 * Menü sorgusu bu projedeki en ağır okuma: ürün görselleri veritabanında
 * data URI olarak duruyor ve ürün başına 250 KB'a çıkabiliyor. 60 ürünlük
 * bir menüde her QR okutması megabaytlarca base64'ü SQLite'tan çekip
 * serileştirmek demek. Cuma akşamı aynı anda okutan 50 kişi aynı veriyi
 * 50 kez okuyordu.
 *
 * Sayfanın kendisi dinamik kalmaya devam ediyor: abonelik süresi ve masa
 * geçerliliği her istekte taze kontrol edilmek zorunda, yoksa askıya alınan
 * bir hesabın menüsü önbellekte yayında kalırdı. Önbelleğe alınan yalnızca
 * bu ağır sorgu.
 */

/** İşletme bazlı etiket: bir kafenin menüsü değişince yalnızca o düşer. */
export function menuEtiketi(businessId: string): string {
  return `menu:${businessId}`;
}

/**
 * Menüde gösterilecek bölümler ve ürünler (tükenenler dahil, pasifler hariç).
 *
 * Önbellek işlevi her çağrıda yeniden kuruluyor: `unstable_cache` etiketi
 * tanım anında sabitliyor, oysa bize işletme bazlı etiket lazım. Kurulum
 * maliyeti yok sayılır, kazanç ise sorgunun tamamı.
 *
 * `revalidate` verilmiyor: içerik yalnızca panelden değiştiğinde bayatlar ve
 * o an zaten etiketi düşürüyoruz. Süreye bağlamak, hiç değişmeyen bir menüyü
 * boş yere yeniden okumak olurdu.
 */
export function menuIcerigi(businessId: string) {
  return unstable_cache(
    async () =>
      prisma.menuCategory.findMany({
        where: { businessId, active: true },
        orderBy: { sortOrder: "asc" },
        include: {
          // Tükenen ürün menüde kalır ama işaretli görünür: "vardı ama bugün
          // yok" bilgisi, ürünün hiç olmaması kadar değerli.
          items: { where: { active: true }, orderBy: { sortOrder: "asc" } },
        },
      }),
    ["menu-icerigi", businessId],
    { tags: [menuEtiketi(businessId)] },
  )();
}
