/**
 * Kaşif rozetleri ve seviye hesabı.
 *
 * Rozet kuralları saf: kazanma koşulu yalnızca "ziyaret sayıları"ndan
 * hesaplanıyor, veritabanından ve tarihten bağımsız. Böylece bir rozetin
 * eşiği değiştiğinde ne olacağı testle görülebiliyor.
 */

/**
 * NOT — şartnamedeki "Tatlı Avcısı" rozeti burada YOK.
 *
 * Kazanma koşulu "5 farklı mekanda tatlı puanla" idi ama sistemde tatlıcı
 * diye bir işletme türü yok (bkz. BUSINESS_TYPES: yeme_icme, balikci,
 * gece_kulubu). Kurala uyan hiçbir mekan olamayacağı için rozet
 * kazanılamaz olurdu; profil ekranında sonsuza kadar "0/5" gösteren bir
 * rozet, hiç olmamasından kötü. Tatlıcı türü eklendiğinde ya da kural
 * menü bölümüne bağlandığında geri gelebilir.
 */
export type RozetAnahtari =
  | "ilkAdim"
  | "kahveGurmesi"
  | "geceKusu"
  | "ustaKasif"
  | "mudavim";

export type RozetTanimi = {
  ad: string;
  aciklama: string;
  /** Kazanıldığında verilen ek kaşif puanı. */
  puan: number;
};

export const ROZETLER: Record<RozetAnahtari, RozetTanimi> = {
  ilkAdim: {
    ad: "İlk Adım",
    aciklama: "İlk doğrulanmış masa ziyaretini yaptın.",
    puan: 50,
  },
  kahveGurmesi: {
    ad: "Kahve Gurmesi",
    aciklama: "5 farklı mekanda doğrulanmış ziyaret.",
    puan: 150,
  },
  geceKusu: {
    ad: "Gece Kuşu",
    aciklama: "Canlı müzik sahnesi olan 3 mekanda bulundun.",
    puan: 150,
  },
  ustaKasif: {
    ad: "Usta Kaşif",
    aciklama: "10 farklı mekanda doğrulanmış ziyaret.",
    puan: 300,
  },
  mudavim: {
    ad: "Müdavim",
    aciklama: "Aynı mekanı 4 kez ziyaret ettin.",
    puan: 200,
  },
};

export const ROZET_ANAHTARLARI = Object.keys(ROZETLER) as RozetAnahtari[];

export function gecerliRozetMi(deger: string): deger is RozetAnahtari {
  return deger in ROZETLER;
}

/**
 * Rozet hesabı için gereken özet.
 *
 * Ham ziyaret listesi yerine sayılar: kural mantığı veritabanı satır
 * biçiminden bağımsız kalsın, test yazmak için elli sahte kayıt kurmak
 * gerekmesin.
 */
export type ZiyaretOzeti = {
  /** Toplam doğrulanmış ziyaret sayısı. */
  toplamZiyaret: number;
  /** Kaç FARKLI mekan ziyaret edildi. */
  farkliMekan: number;
  /** Canlı müzik sahnesi olan kaç farklı mekan ziyaret edildi. */
  canliMuzikMekani: number;
  /** Tek bir mekandaki en yüksek ziyaret sayısı. */
  enCokZiyaretEdilenMekan: number;
};

/** Özete göre hak edilen bütün rozetler (daha önce kazanılmış olsa bile). */
export function hakEdilenRozetler(ozet: ZiyaretOzeti): RozetAnahtari[] {
  const kazanilan: RozetAnahtari[] = [];

  if (ozet.toplamZiyaret >= 1) kazanilan.push("ilkAdim");
  if (ozet.farkliMekan >= 5) kazanilan.push("kahveGurmesi");
  if (ozet.canliMuzikMekani >= 3) kazanilan.push("geceKusu");
  if (ozet.farkliMekan >= 10) kazanilan.push("ustaKasif");
  if (ozet.enCokZiyaretEdilenMekan >= 4) kazanilan.push("mudavim");

  return kazanilan;
}

/**
 * Bu ziyaretle YENİ kazanılan rozetler.
 *
 * Ayrı bir fonksiyon çünkü uygulama "tebrikler, X rozetini açtın"
 * ekranını yalnızca ilk kazanımda göstermeli; her ziyarette aynı rozeti
 * kutlamak kutlamayı anlamsızlaştırır.
 */
export function yeniRozetler(
  ozet: ZiyaretOzeti,
  mevcutRozetler: string[],
): RozetAnahtari[] {
  const sahipOlunan = new Set(mevcutRozetler);
  return hakEdilenRozetler(ozet).filter((r) => !sahipOlunan.has(r));
}

/**
 * Puandan seviye.
 *
 * Eşikler artan aralıklı: ilk seviyeler hızlı gelsin (yeni kullanıcı
 * ilerlediğini görsün), üst seviyeler seyrekleşsin.
 */
const SEVIYE_ESIKLERI = [0, 100, 300, 700, 1500, 3000];

export function seviye(puan: number): number {
  let sonuc = 1;
  for (let i = 0; i < SEVIYE_ESIKLERI.length; i++) {
    if (puan >= SEVIYE_ESIKLERI[i]) sonuc = i + 1;
  }
  return sonuc;
}

/** Bir sonraki seviyeye kalan puan; en üst seviyedeyse null. */
export function sonrakiSeviyeyeKalan(puan: number): number | null {
  const sonraki = SEVIYE_ESIKLERI.find((esik) => esik > puan);
  return sonraki === undefined ? null : sonraki - puan;
}
