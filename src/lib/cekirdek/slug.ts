import { randomBytes } from "node:crypto";
import { cakisanAlanlar } from "./unique-error";

/**
 * İşletme adresi (slug) üretimi.
 *
 * Slug, müşterinin okuttuğu karekodun içindeki adrestir: /f/<slug>/<masa>.
 * Bu yüzden iki işletmenin aynı slug'a sahip olması, bir kafenin karekodunun
 * başka bir kafenin anketini açması demek olurdu. Veritabanındaki
 * `slug @unique` kısıtı bunun gerçekleşmesini engelliyor — ama tek başına
 * yetmiyor: kısıt ihlali kayıt sırasında hata fırlatıyor ve o hata daha önce
 * kullanıcıya "işletme adresi zaten kullanılıyor" diye yansıyordu.
 *
 * İki ayrı çakışma yolu vardı:
 *
 * 1. "Önce bak, sonra yaz" yarışı. Aynı anda iki kişi "Keskin Lezzetler"
 *    yazarsa ikisinin de kontrolü boş döner, ikisi de aynı slug'ı yazmaya
 *    çalışır ve biri hata alır. Kontrol ile kayıt arasındaki boşluk ne kadar
 *    kısa olursa olsun kapanmaz; çözüm kontrol değil, çakışınca yeniden
 *    denemektir.
 * 2. Tek atışlık ek. Eski kod çakışma görünce sonuna rastgele bir ek koyup
 *    bir kez daha deniyordu; o da tutulmuşsa kayıt düşüyordu.
 *
 * Burada ikisi de kapanıyor: kayıt denenir, veritabanı "bu slug alınmış"
 * derse yeni bir ek üretilip tekrar denenir. Karar mercii tek: veritabanı.
 */

/** Türkçe harfleri sadeleştirip adres için güvenli bir govde üretir. */
export function slugify(value: string): string {
  const map: Record<string, string> = {
    ç: "c", Ç: "c", ğ: "g", Ğ: "g", ı: "i", İ: "i",
    ö: "o", Ö: "o", ş: "s", Ş: "s", ü: "u", Ü: "u",
  };
  return value
    .split("")
    .map((char) => map[char] ?? char)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Prisma'nın "benzersizlik kısıtı ihlal edildi" hatası, slug alanı için mi?
 *
 * Alan adını `unique-error.ts` çıkarıyor: Prisma sürüm ve sürücüye göre onu
 * üç ayrı yere yazabiliyor ve burada ikinci bir kopya tutmak, biri
 * güncellenip diğeri unutulduğunda sessizce yanlış cevap verirdi.
 */
export function slugCakismasiMi(hata: unknown): boolean {
  if (typeof hata !== "object" || hata === null) return false;
  if ((hata as { code?: unknown }).code !== "P2002") return false;
  return cakisanAlanlar(hata).some((alan) => alan.split(".").pop() === "slug");
}

/** Gövdeye kısa, tahmin edilemeyen bir ek. Hex: her zaman 6 karakter. */
function ek(): string {
  return randomBytes(3).toString("hex");
}

export const MAX_SLUG_DENEMESI = 6;

/**
 * `yaz` işlemini benzersiz bir slug'la çalıştırır; slug çakışırsa yeni bir
 * ek üretip yeniden dener.
 *
 * İlk deneme sade govdeyi kullanır ("keskin-lezzetler"), sonrakiler ek alır
 * ("keskin-lezzetler-k3f9"). Böylece ilk kaydolan güzel adresi alır,
 * sonrakiler okunabilir ama ayrı bir adres alır.
 */
export async function slugIleOlustur<T>(
  govde: string,
  yaz: (slug: string) => Promise<T>,
): Promise<T> {
  const taban = slugify(govde);
  if (!taban) throw new Error("İşletme adından geçerli bir adres üretilemedi.");

  for (let deneme = 0; deneme < MAX_SLUG_DENEMESI; deneme++) {
    const slug = deneme === 0 ? taban : `${taban}-${ek()}`;
    try {
      return await yaz(slug);
    } catch (hata) {
      if (!slugCakismasiMi(hata)) throw hata;
    }
  }

  // Buraya düşmek pratikte imkânsız (her deneme ~16 milyon ihtimalden biri);
  // yine de sessizce yanlış bir slug yazmaktansa açıkça patlıyoruz.
  throw new Error("İşletme adresi üretilemedi, lütfen tekrar deneyin.");
}
