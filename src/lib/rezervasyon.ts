/**
 * Rezervasyon kuralları.
 *
 * Kurallar saf fonksiyonlarda çünkü buradaki hatalar sessiz ve pahalı:
 * çakışma kontrolü gevşerse aynı masaya iki grup gelir ve biri kapıdan
 * döner; fazla sıkı olursa boş masa satılamaz. İkisi de ancak müşteri
 * mekana geldiğinde fark edilir, o yüzden testle bağlanıyor.
 */

/** Rezervasyonun yaşam döngüsü. */
export const REZERVASYON_DURUMLARI = {
  bekliyor: "Onay bekliyor",
  onaylandi: "Onaylandı",
  oturdu: "Masada",
  tamamlandi: "Tamamlandı",
  iptal: "İptal edildi",
  gelmedi: "Gelmedi",
} as const;

export type RezervasyonDurumu = keyof typeof REZERVASYON_DURUMLARI;

export const REZERVASYON_DURUM_ANAHTARLARI = Object.keys(
  REZERVASYON_DURUMLARI,
) as RezervasyonDurumu[];

export function gecerliDurumMu(deger: string): deger is RezervasyonDurumu {
  return (REZERVASYON_DURUM_ANAHTARLARI as string[]).includes(deger);
}

/**
 * Masayı MEŞGUL eden durumlar.
 *
 * "iptal" ve "gelmedi" masayı serbest bırakıyor: iptal edilen bir kayıt
 * yüzünden akşamın en iyi masasının boş kalması, kaydı silmeye
 * zorlardı — oysa "kaç rezervasyon iptal oldu / kaç kişi gelmedi"
 * sorusu ancak iz kalırsa cevaplanabiliyor.
 */
const MESGUL_DURUMLAR: RezervasyonDurumu[] = [
  "bekliyor",
  "onaylandi",
  "oturdu",
];

export function masayiMesgulEderMi(durum: string): boolean {
  return (MESGUL_DURUMLAR as string[]).includes(durum);
}

/** Rezervasyonun kaynağı. */
export const REZERVASYON_KANALLARI = {
  panel: "Panelden",
  telefon: "Telefonla",
  walkin: "Kapıdan (rezervasyonsuz)",
  biyerlere: "Biyerlere uygulaması",
} as const;

export type RezervasyonKanali = keyof typeof REZERVASYON_KANALLARI;

export function gecerliKanalMi(deger: string): deger is RezervasyonKanali {
  return Object.keys(REZERVASYON_KANALLARI).includes(deger);
}

/** Varsayılan oturma süresi — panelde saat seçilirken önerilen aralık. */
export const VARSAYILAN_SURE_DAKIKA = 120;

/**
 * İki rezervasyon arasında masanın hazırlanması için bırakılan pay.
 *
 * 15 dakika: kalkan masanın toplanıp kurulması. Sıfır olsaydı 21:00'de
 * biten rezervasyonun üstüne 21:00 kaydı alınır, ikinci grup ayakta
 * beklerdi. Aralıklar yarı açık ([başlangıç, bitiş)) olduğu için bu pay
 * OLMASA da 21:00-23:00 kaydı teknik olarak çakışmıyor; pay onu
 * gerçekten uygulanabilir hale getiriyor.
 */
export const TEMIZLIK_PAYI_DAKIKA = 15;

export type ZamanAraligi = { baslangic: Date; bitis: Date };

/**
 * İki aralık kesişiyor mu.
 *
 * Yarı açık aralık: bitiş anı dahil değil. 19:00-21:00 ile 21:00-23:00
 * ÇAKIŞMAZ — arka arkaya iki oturum, gerçek hayattaki karşılığı da bu.
 */
export function araliklarCakisiyorMu(a: ZamanAraligi, b: ZamanAraligi): boolean {
  return a.baslangic < b.bitis && b.baslangic < a.bitis;
}

/** Aralığı temizlik payı kadar genişletir (çakışma kontrolü için). */
export function payliAralik(
  aralik: ZamanAraligi,
  payDakika: number = TEMIZLIK_PAYI_DAKIKA,
): ZamanAraligi {
  const pay = payDakika * 60 * 1000;
  return {
    baslangic: new Date(aralik.baslangic.getTime() - pay),
    bitis: new Date(aralik.bitis.getTime() + pay),
  };
}

export type MevcutRezervasyon = {
  id: string;
  baslangic: Date;
  bitis: Date;
  durum: string;
  masaIdleri: string[];
};

export type CakismaSonucu = {
  cakisiyor: boolean;
  /** Çakışan rezervasyonlar ve hangi masalarda çakıştıkları. */
  catismalar: { rezervasyonId: string; masaIdleri: string[] }[];
};

/**
 * İstenen masa+aralık için çakışma var mı.
 *
 * `haricRezervasyonId` bir kaydı DÜZENLERKEN gerekiyor: kayıt kendi
 * kendisiyle çakışıyor sayılırsa saatini bir dakika bile
 * değiştiremezsiniz.
 */
export function cakismaBul(
  istenen: ZamanAraligi & { masaIdleri: string[] },
  mevcutlar: MevcutRezervasyon[],
  secenekler: { haricRezervasyonId?: string; payDakika?: number } = {},
): CakismaSonucu {
  const { haricRezervasyonId, payDakika = TEMIZLIK_PAYI_DAKIKA } = secenekler;
  const istenenPayli = payliAralik(istenen, payDakika);
  const istenenMasalar = new Set(istenen.masaIdleri);

  const catismalar: { rezervasyonId: string; masaIdleri: string[] }[] = [];

  for (const mevcut of mevcutlar) {
    if (mevcut.id === haricRezervasyonId) continue;
    if (!masayiMesgulEderMi(mevcut.durum)) continue;
    if (!araliklarCakisiyorMu(istenenPayli, mevcut)) continue;

    const ortakMasalar = mevcut.masaIdleri.filter((id) => istenenMasalar.has(id));
    if (ortakMasalar.length > 0) {
      catismalar.push({ rezervasyonId: mevcut.id, masaIdleri: ortakMasalar });
    }
  }

  return { cakisiyor: catismalar.length > 0, catismalar };
}

/** Anlık masa durumu — krokideki renk bunun karşılığı. */
export type MasaDurumu = "bos" | "dolu" | "yaklasan" | "kapali";

/**
 * "Yaklaşan" sayılma eşiği: bu kadar süre içinde rezervasyonu olan masa
 * sarıya döner. 60 dakika, garsonun "burayı ayırmam lazım" diye
 * düşünmeye başladığı an.
 */
export const YAKLASAN_ESIK_DAKIKA = 60;

/**
 * Bir masanın verilen an için durumu.
 *
 * Öncelik sırası bilinçli: önce KAPALI (masa devre dışıysa geri kalanı
 * konuşmanın anlamı yok), sonra DOLU (şu an biri oturuyor), sonra
 * YAKLAŞAN. Sıra ters olsaydı, üstünde müşteri oturan bir masa "birazdan
 * rezerve" diye sarı görünebilirdi.
 */
export function masaDurumu(
  masa: { aktif: boolean },
  masaninRezervasyonlari: MevcutRezervasyon[],
  simdi: Date = new Date(),
  yaklasanEsikDakika: number = YAKLASAN_ESIK_DAKIKA,
): MasaDurumu {
  if (!masa.aktif) return "kapali";

  const mesgul = masaninRezervasyonlari.filter((r) => masayiMesgulEderMi(r.durum));

  const suAn = mesgul.some((r) => r.baslangic <= simdi && simdi < r.bitis);
  if (suAn) return "dolu";

  const esik = new Date(simdi.getTime() + yaklasanEsikDakika * 60 * 1000);
  const yaklasan = mesgul.some((r) => r.baslangic > simdi && r.baslangic <= esik);
  if (yaklasan) return "yaklasan";

  return "bos";
}

/** Krokideki renkler — panel ve (ileride) mobil aynı dili konuşsun. */
export const MASA_DURUM_RENKLERI: Record<MasaDurumu, string> = {
  bos: "#10B981",
  dolu: "#EF4444",
  yaklasan: "#F5A524",
  kapali: "#6B7280",
};

export const MASA_DURUM_ADLARI: Record<MasaDurumu, string> = {
  bos: "Boş",
  dolu: "Dolu",
  yaklasan: "Yaklaşan rezervasyon",
  kapali: "Kapalı",
};

export type KapasiteSonucu =
  | { uygun: true; toplamKapasite: number }
  | { uygun: false; toplamKapasite: number; eksik: number };

/**
 * Seçilen masaların toplam kapasitesi gruba yetiyor mu.
 *
 * Masa birleştirmenin karşılığı bu: 8 kişilik grup için iki adet 4'lük
 * masa seçildiğinde toplam 8 olur ve uygun sayılır. Yetmiyorsa
 * ENGELLEMİYOR, yalnızca eksiği söylüyor — mekan sahibi "sıkışırlar,
 * olsun" diyebilmeli; sistemin işi karar vermek değil, uyarmak.
 */
export function kapasiteYeterliMi(
  masalar: { kapasite: number }[],
  kisiSayisi: number,
): KapasiteSonucu {
  const toplamKapasite = masalar.reduce((t, m) => t + m.kapasite, 0);
  if (toplamKapasite >= kisiSayisi) return { uygun: true, toplamKapasite };
  return { uygun: false, toplamKapasite, eksik: kisiSayisi - toplamKapasite };
}

export type DogrulamaHatasi = { alan: string; mesaj: string };

/**
 * Kayıt öncesi biçimsel doğrulama.
 *
 * Çakışma ve kapasite AYRI: onlar veritabanındaki başka kayıtlara
 * bakmayı gerektiriyor, buradakiler ise tek başına formdan anlaşılıyor.
 */
export function rezervasyonDogrula(girdi: {
  misafirAdi: string;
  kisiSayisi: number;
  baslangic: Date;
  bitis: Date;
  masaIdleri: string[];
}): DogrulamaHatasi[] {
  const hatalar: DogrulamaHatasi[] = [];

  if (!girdi.misafirAdi.trim()) {
    hatalar.push({ alan: "misafirAdi", mesaj: "Misafir adı gerekli." });
  }
  if (!Number.isFinite(girdi.kisiSayisi) || girdi.kisiSayisi < 1) {
    hatalar.push({ alan: "kisiSayisi", mesaj: "Kişi sayısı en az 1 olmalı." });
  }
  if (girdi.masaIdleri.length === 0) {
    hatalar.push({ alan: "masalar", mesaj: "En az bir masa seçin." });
  }
  if (!(girdi.baslangic instanceof Date) || Number.isNaN(girdi.baslangic.getTime())) {
    hatalar.push({ alan: "baslangic", mesaj: "Başlangıç saati geçersiz." });
  } else if (!(girdi.bitis instanceof Date) || Number.isNaN(girdi.bitis.getTime())) {
    hatalar.push({ alan: "bitis", mesaj: "Bitiş saati geçersiz." });
  } else if (girdi.bitis <= girdi.baslangic) {
    hatalar.push({ alan: "bitis", mesaj: "Bitiş, başlangıçtan sonra olmalı." });
  } else if (girdi.bitis.getTime() - girdi.baslangic.getTime() > 12 * 60 * 60 * 1000) {
    // Üst sınır, yanlışlıkla yıllık bir aralık girilip masanın aylarca
    // meşgul görünmesini engelliyor.
    hatalar.push({ alan: "bitis", mesaj: "Rezervasyon en fazla 12 saat sürebilir." });
  }

  return hatalar;
}

/** Kroki konumu 0-100 aralığında tutulur (bkz. Table.planX şema yorumu). */
export function planKonumuKirp(deger: number): number {
  if (!Number.isFinite(deger)) return 0;
  return Math.min(100, Math.max(0, Math.round(deger * 100) / 100));
}
