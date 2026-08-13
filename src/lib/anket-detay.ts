import { foldTr } from "./text";

/**
 * Düşük puan verilen kategoride sorulan "hangi alanda?" seçenekleri.
 *
 * "Mekan pis" ile "tuvaletler pis" arasındaki fark, patronun ne yapacağını
 * bilmesiyle bilmemesi arasındaki farktır. Bu yüzden 1-2 yıldızda kategoriyi
 * bir kademe daha kırıyoruz.
 *
 * İşletme kendi listesini yazabilir; yazmadıysa kategori adına bakıp makul
 * bir varsayılan veriyoruz. Varsayılan olmasaydı özellik, ayarlara girip
 * tek tek liste yazan azınlık dışında hiç çalışmazdı.
 */

/** Düşük sayılan ve alt soruyu tetikleyen puan sınırı (bu değer ve altı). */
export const DUSUK_PUAN = 2;

/** Bir kategoride işaretlenebilecek en fazla sorun alanı. */
export const EN_FAZLA_SECIM = 4;

/**
 * Kategori adında geçen anahtar kelimeye göre varsayılan seçenekler.
 *
 * Sıra önemli: ilk eşleşen kazanır, bu yüzden daha özel olan üstte.
 */
const VARSAYILANLAR: { anahtarlar: string[]; secenekler: string[] }[] = [
  {
    anahtarlar: ["temizlik", "hijyen"],
    secenekler: ["Tuvaletler", "Masalar", "Zemin", "Çatal-bıçak", "Bardaklar"],
  },
  {
    anahtarlar: ["servis", "personel", "garson", "ilgi"],
    secenekler: ["Çok beklettiler", "İlgisizdi", "Sipariş yanlış geldi", "Üslup kötüydü"],
  },
  {
    anahtarlar: ["lezzet", "yemek", "mutfak", "tat"],
    secenekler: ["Soğuktu", "Tuzu/baharatı", "Porsiyon küçüktü", "Tazelik", "Sunum"],
  },
  {
    anahtarlar: ["hiz", "sure", "bekleme"],
    secenekler: ["Sipariş alınması", "Yemeğin gelmesi", "Hesap ödemesi"],
  },
  {
    anahtarlar: ["fiyat", "hesap", "ucret"],
    secenekler: ["Porsiyona göre pahalı", "Menüdeki fiyat farklıydı", "Servis ücreti"],
  },
  {
    anahtarlar: ["ambiyans", "atmosfer", "ortam", "mekan", "muzik", "konfor"],
    secenekler: ["Gürültü", "Müzik sesi", "Isı/havalandırma", "Aydınlatma", "Koltuklar"],
  },
  {
    anahtarlar: ["sunum", "servis tabagi", "tabak"],
    secenekler: ["Tabak düzeni", "Sıcaklık", "Porsiyon görünümü"],
  },
  {
    anahtarlar: ["tuvalet", "lavabo", "wc"],
    secenekler: ["Temizlik", "Kağıt/sabun yok", "Koku", "Sıra bekledim"],
  },
  {
    anahtarlar: ["otopark", "vale", "park"],
    secenekler: ["Yer yoktu", "Uzun bekledim", "Ücret"],
  },
];

/** Virgülle ayrılmış listeyi temizleyip diziye çevirir. */
export function secenekleriAyristir(ham: string | null | undefined): string[] {
  if (!ham) return [];
  return [
    ...new Set(
      ham
        .split(",")
        .map((s) => s.trim().slice(0, 40))
        .filter(Boolean),
    ),
  ].slice(0, 8);
}

/** Diziyi saklanacak biçime çevirir. Boş liste null olur. */
export function secenekleriBirlestir(secenekler: string[]): string | null {
  const temiz = secenekleriAyristir(secenekler.join(","));
  return temiz.length > 0 ? temiz.join(",") : null;
}

/**
 * Bir kategori için gösterilecek sorun seçenekleri.
 *
 * İşletmenin kendi listesi varsa o kullanılır; yoksa ada göre varsayılan.
 * Hiçbiri tutmuyorsa boş döner ve alt soru hiç açılmaz — uydurma bir liste
 * göstermektense sormamak daha doğru.
 */
export function sorunSecenekleri(
  kategoriAdi: string,
  kayitli: string | null | undefined,
): string[] {
  const kendi = secenekleriAyristir(kayitli);
  if (kendi.length > 0) return kendi;

  const ad = foldTr(kategoriAdi);
  for (const grup of VARSAYILANLAR) {
    if (grup.anahtarlar.some((anahtar) => ad.includes(anahtar))) {
      return grup.secenekler;
    }
  }
  return [];
}

/**
 * Ankette işaretlenen sorun alanlarını saklanacak JSON'a çevirir.
 *
 * Yalnızca gerçekten düşük puan verilen kategoriler yazılır: müşteri önce
 * 2 verip sonra 5'e çıkardıysa eski işaretleri taşımak, patronu olmayan bir
 * sorunun peşine düşürür.
 */
export function detaylariDerle(
  secimler: Record<string, string[]>,
  puanlar: Record<string, number>,
): string | null {
  const sonuc: Record<string, string[]> = {};
  for (const [kategori, alanlar] of Object.entries(secimler)) {
    const puan = puanlar[kategori] ?? 0;
    if (puan === 0 || puan > DUSUK_PUAN) continue;
    const temiz = alanlar.filter(Boolean).slice(0, EN_FAZLA_SECIM);
    if (temiz.length > 0) sonuc[kategori] = temiz;
  }
  return Object.keys(sonuc).length > 0 ? JSON.stringify(sonuc) : null;
}

/** Saklanan JSON'u panelde göstermek için çözer; bozuksa boş döner. */
export function detaylariCoz(ham: string | null | undefined): Record<string, string[]> {
  if (!ham) return {};
  try {
    const cozulen: unknown = JSON.parse(ham);
    if (!cozulen || typeof cozulen !== "object" || Array.isArray(cozulen)) return {};
    const sonuc: Record<string, string[]> = {};
    for (const [anahtar, deger] of Object.entries(cozulen as Record<string, unknown>)) {
      if (Array.isArray(deger)) {
        const metinler = deger.filter((d): d is string => typeof d === "string");
        if (metinler.length > 0) sonuc[anahtar] = metinler;
      }
    }
    return sonuc;
  } catch {
    // Elle düzenlenmiş ya da bozulmuş kayıt panelin tamamını düşürmesin.
    return {};
  }
}
