/**
 * Masadaki karekodun içindeki adresi çözer.
 *
 * Basılı karekod bir Biyerlere/Quarkod adresi taşıyor:
 *
 *   https://alanadi.com/f/<slug>/<masa>
 *   https://alanadi.com/f/<slug>/<masa>/menu     (menüye kısayol)
 *   https://alanadi.com/f/<slug>/<masa>/anket
 *
 * Aynı karekod hem tarayıcıda (anonim anket) hem uygulamada (doğrulanmış
 * ziyaret) çalışıyor; bu yüzden basılı kodları yenilemek gerekmiyor.
 *
 * Saf tutuldu ve testli: kamera akışında bir hata ayıklamak zor —
 * kullanıcı "okutuyorum, bir şey olmuyor" diyor ve elde log kalmıyor.
 * Adres ayrıştırma en olası kırılma noktası, o yüzden burada duruyor.
 */

export type QrHedefi = {
  slug: string;
  /** Masa numarası; giriş karekodunda boş olabilir. */
  masa: string | null;
};

/** Yol parçalarını güvenle çözer — bozuk yüzde kodlaması çökmesin. */
function parcaCoz(parca: string): string {
  try {
    return decodeURIComponent(parca);
  } catch {
    return parca;
  }
}

/**
 * Okunan metinden mekan ve masayı çıkarır; tanımadığı bir kodda null.
 *
 * Alan adı KONTROL EDİLMİYOR: geliştirmede `192.168.1.x:3000`, canlıda
 * kendi alan adı, ileride özel alan adları olabilir. Kodun bize ait olup
 * olmadığına sunucu karar veriyor (bilinmeyen slug → 404); istemcide
 * alan adı beyaz listesi tutmak, sahada yalnızca yanlış negatif üretirdi.
 */
export function qrCoz(ham: string): QrHedefi | null {
  const metin = ham.trim();
  if (!metin) return null;

  let yol: string;
  try {
    yol = new URL(metin).pathname;
  } catch {
    // Şemasız yazılmış olabilir ("alanadi.com/f/kafe/3"); bir şema
    // uydurup tekrar deniyoruz. Düz bir yol ("/f/kafe/3") da buraya düşer.
    try {
      yol = new URL(`https://x/${metin.replace(/^\/+/, "")}`).pathname;
    } catch {
      return null;
    }
  }

  const parcalar = yol.split("/").filter(Boolean).map(parcaCoz);
  const f = parcalar.indexOf("f");
  if (f === -1) return null;

  const slug = parcalar[f + 1];
  if (!slug) return null;

  const sonraki = parcalar[f + 2];
  // "/f/<slug>/menu" gibi masa taşımayan adreslerde masa null kalmalı;
  // "menu" masa numarası sanılırsa sunucuya olmayan bir masa gider.
  const masa = sonraki && !["menu", "anket", "duyurular"].includes(sonraki) ? sonraki : null;

  return { slug, masa };
}
