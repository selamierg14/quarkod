import {
  gecerliKoordinatMi,
  gecerliSegmentMi,
  mesafeMetre,
  ozellikleriCoz,
  type FiyatSegmenti,
  type Koordinat,
  type MekanOzelligi,
} from "./mekan";
import { gecerliOzellikMi } from "./mekan";

/**
 * Biyerlere keşfet listesinin süzme ve sıralama kuralları.
 *
 * Saf tutuldu: mesafe eşiği, özellik kesişimi ve sıralama veritabanından
 * ve HTTP katmanından bağımsız test edilebilsin. Buradaki bir hata
 * doğrudan "kullanıcıya 20 km ötedeki kafe yakın diye gösteriliyor" ya da
 * "priz filtresi prizsiz mekanı geçiriyor" demek.
 */

/** İstemciden gelen ham sorgu; hepsi isteğe bağlı. */
export type KesfetSorgusu = {
  konum: Koordinat | null;
  /** Metre cinsinden yarıçap; konum yoksa dikkate alınmaz. */
  yaricapMetre: number;
  ozellikler: MekanOzelligi[];
  segment: FiyatSegmenti | null;
  arama: string;
};

/** Varsayılan yarıçap: şehir içi "çevremde" için makul bir mesafe. */
export const VARSAYILAN_YARICAP_METRE = 5_000;

/**
 * En geniş yarıçap.
 *
 * Sınırsız bırakmak, tek istekle bütün veritabanını dökmek demekti —
 * hem sunucuyu hem de mobil tarafı gereksiz yorar.
 */
export const EN_BUYUK_YARICAP_METRE = 50_000;

function sayiCoz(ham: string | null, varsayilan: number): number {
  if (!ham) return varsayilan;
  const sayi = Number(ham);
  return Number.isFinite(sayi) ? sayi : varsayilan;
}

/**
 * URL sorgu parametrelerini süzme ölçütlerine çevirir.
 *
 * Tanınmayan değerler sessizce atılıyor (hata döndürmüyoruz): mobil
 * uygulamanın eski bir sürümü kaldırılmış bir özellik adı gönderirse
 * kullanıcı boş ekranla değil, o filtre yokmuş gibi bir listeyle
 * karşılaşsın.
 */
export function sorguCoz(params: URLSearchParams): KesfetSorgusu {
  const enlem = Number(params.get("enlem"));
  const boylam = Number(params.get("boylam"));
  const konumVar =
    params.has("enlem") && params.has("boylam") && gecerliKoordinatMi(enlem, boylam);

  const yaricap = sayiCoz(params.get("mesafe"), VARSAYILAN_YARICAP_METRE);
  const segment = params.get("segment") ?? "";

  return {
    konum: konumVar ? { enlem, boylam } : null,
    yaricapMetre: Math.min(Math.max(100, yaricap), EN_BUYUK_YARICAP_METRE),
    ozellikler: (params.get("ozellik") ?? "")
      .split(",")
      .map((o) => o.trim())
      .filter(gecerliOzellikMi),
    segment: gecerliSegmentMi(segment) ? segment : null,
    arama: (params.get("q") ?? "").trim().slice(0, 60),
  };
}

/** Listelenecek mekanın süzme için gereken alanları. */
export type KesfetAdayi = {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  priceSegment: string | null;
  mekanOzellikleri: string | null;
};

export type MesafeliMekan<T extends KesfetAdayi> = T & {
  /** Konum verilmediyse null — "bilinmiyor" ile "0 metre" karışmasın. */
  mesafeMetre: number | null;
};

/**
 * Adayları süzer ve sıralar.
 *
 * Özellik filtresi KESİŞİM: "priz + bahçe" seçen kullanıcı ikisi birden
 * olan mekanları görür, biri olanı değil. Menü etiket filtresiyle aynı
 * mantık — kullanıcı filtre eklerken listeyi daraltmayı bekler.
 *
 * Sıralama: konum verilmişse en yakından uzağa, verilmemişse ada göre.
 * Mesafeye göre sıralarken koordinatsız mekan zaten listeye hiç girmiyor
 * (çağıran taraf onları eliyor), o yüzden null mesafe sonda kalma gibi
 * bir belirsizlik oluşmuyor.
 */
export function mekanlariSuz<T extends KesfetAdayi>(
  adaylar: T[],
  sorgu: KesfetSorgusu,
): MesafeliMekan<T>[] {
  const sonuc: MesafeliMekan<T>[] = [];

  for (const aday of adaylar) {
    if (sorgu.segment && aday.priceSegment !== sorgu.segment) continue;

    if (sorgu.ozellikler.length > 0) {
      const mevcut = ozellikleriCoz(aday.mekanOzellikleri);
      const hepsiVar = sorgu.ozellikler.every((o) => mevcut.includes(o));
      if (!hepsiVar) continue;
    }

    let mesafe: number | null = null;
    if (sorgu.konum) {
      if (aday.latitude === null || aday.longitude === null) continue;
      mesafe = mesafeMetre(sorgu.konum, {
        enlem: aday.latitude,
        boylam: aday.longitude,
      });
      if (mesafe > sorgu.yaricapMetre) continue;
    }

    sonuc.push({ ...aday, mesafeMetre: mesafe });
  }

  sonuc.sort((a, b) => {
    if (a.mesafeMetre !== null && b.mesafeMetre !== null) {
      return a.mesafeMetre - b.mesafeMetre;
    }
    return a.name.localeCompare(b.name, "tr");
  });

  return sonuc;
}

/**
 * Yarıçapı kapsayan enlem/boylam sınırları.
 *
 * Mesafeyi veritabanında hesaplamak PostGIS ya da ham SQL isterdi; bunun
 * yerine önce ucuz bir dikdörtgenle aday kümesini daraltıp kesin mesafeyi
 * bellekte hesaplıyoruz. Dikdörtgen daireden geniş olduğu için
 * kaçırılan mekan olmuyor — fazladan gelenleri mekanlariSuz eliyor.
 */
export function sinirKutusu(merkez: Koordinat, yaricapMetre: number) {
  const enlemDerecesi = yaricapMetre / 111_320;
  // Boylam dereceleri kutuplara yaklaştıkça daralıyor; enlemin kosinüsüyle
  // düzeltilmezse yüksek enlemlerde kutu gereğinden dar kalır ve gerçekten
  // yakın mekanlar listeden düşerdi.
  const kosinus = Math.max(0.01, Math.cos((merkez.enlem * Math.PI) / 180));
  const boylamDerecesi = yaricapMetre / (111_320 * kosinus);

  return {
    enlemMin: merkez.enlem - enlemDerecesi,
    enlemMax: merkez.enlem + enlemDerecesi,
    boylamMin: merkez.boylam - boylamDerecesi,
    boylamMax: merkez.boylam + boylamDerecesi,
  };
}
