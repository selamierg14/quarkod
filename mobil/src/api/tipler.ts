/**
 * `/api/app/*` yanıt tipleri.
 *
 * Backend'deki tiplerin ELLE kopyası değil, o uçların GERÇEKTEN döndüğü
 * gövdenin karşılığı: sunucu tarafında `MekanOzet` gibi bir tip var ama
 * JSON'a serileşince `Date` alanları `string` oluyor. Buradaki tipler o
 * "tel üstündeki" hâli tarif ediyor — aradaki farkı görmezden gelmek,
 * `tarih.getTime is not a function` olarak geri döner.
 */

export type AppKullanici = {
  id: string;
  username: string;
  name: string;
  puan: number;
  referralCode: string;
  plusUyeMi: boolean;
};

export type GirisYaniti = {
  jeton: string;
  kullanici: AppKullanici;
};

export type Rozet = {
  anahtar: string;
  ad: string;
  aciklama: string;
  puan: number;
  kazanildi: boolean;
  kazanilmaTarihi: string | null;
};

export type ProfilYaniti = {
  kullanici: AppKullanici & {
    seviye: number;
    sonrakiSeviyeyeKalan: number | null;
    dogrulanmisZiyaret: number;
    /** Kupon özelliği kapalıyken sunucu bu alanı HİÇ göndermiyor. */
    cuzdandakiKupon?: number;
    davetEttigiKisiSayisi: number;
  };
  rozetler: Rozet[];
  sonZiyaretler: {
    id: string;
    tarih: string;
    mekan: { id: string; slug: string; ad: string; logoUrl: string | null };
  }[];
};

export type MekanOzet = {
  id: string;
  slug: string;
  ad: string;
  tur: string;
  adres: string | null;
  logoUrl: string | null;
  kapakUrl: string | null;
  markaRengi: string;
  instagram: string | null;
  konum: { enlem: number | null; boylam: number | null };
  mesafeMetre: number | null;
  fiyatSegmenti: string | null;
  ozellikler: string[];
  puan: number | null;
  degerlendirmeSayisi: number;
  sponsorluMu: boolean;
  etkinlikler: {
    id: string;
    baslik: string;
    aciklama: string | null;
    gorselUrl: string | null;
    baslangic: string | null;
    bitis: string | null;
  }[];
};

export type MekanListesi = { adet: number; mekanlar: MekanOzet[] };

export type MekanKisa = {
  id: string;
  slug: string;
  ad: string;
  logoUrl: string | null;
};

export type CuzdanYaniti = {
  kuponlar: {
    id: string;
    indirim: string;
    sonKullanma: string | null;
    mekan: MekanKisa;
    /** Kasada okutulan, süreli olarak yenilenen kod. */
    kod: string;
    kodKalanSaniye: number;
  }[];
  gecmisKuponlar: {
    id: string;
    indirim: string;
    kullanildi: boolean;
    kullanilmaTarihi: string | null;
    sonKullanma: string | null;
    mekan: MekanKisa;
  }[];
  sadakatKartlari: {
    mekan: MekanKisa;
    toplamZiyaret: number;
    damgaSayisi: number;
    esik: number;
    kalanZiyaret: number;
    hediyeKazanildiMi: boolean;
  }[];
};

/**
 * `/api/app/mekanlar/[slug]` yanıtı.
 *
 * Listeden (`MekanOzet`) ayrı: menü onlarca ürün taşıyor ve bunu liste
 * yanıtına koymak, kullanıcının hiç açmayacağı kırk mekanın menüsünü de
 * indirmesi demekti (sunucudaki aynı gerekçe).
 */
export type MekanUrunu = {
  id: string;
  ad: string;
  aciklama: string | null;
  fiyatKurus: number;
  gorselUrl: string | null;
  etiketler: string[];
  tukendi: boolean;
  kaloriKcal: number | null;
  alerjenler: string[];
};

export type MekanDetay = MekanOzet & {
  siparisLinkleri: {
    yemeksepeti: string | null;
    getir: string | null;
    trendyol: string | null;
    migros: string | null;
  };
  telefon: string | null;
  biyerlerePlusOrtagi: boolean;
  menu: {
    fiyatGuncelleme: string | null;
    bolumler: { id: string; ad: string; urunler: MekanUrunu[] }[];
  };
  dogrulanmisYorumlar: {
    id: string;
    isim: string;
    yorum: string;
    puan: number | null;
    tarih: string;
    rozetler: string[];
  }[];
};

export type MekanDetayYaniti = { mekan: MekanDetay };

/** `/api/app/ziyaret` başarı yanıtı (201). */
export type ZiyaretYaniti = {
  ziyaret: { id: string; mekanAdi: string; mesafeMetre: number | null; tarih: string };
  kazanilanPuan: number;
  yeniRozetler: { anahtar: string; ad: string; aciklama: string; puan: number }[];
  toplamPuan: number;
  seviye: number;
  /**
   * Sadakat damga kartı — sunucu bu özelliği kapatabiliyor ve o zaman alan
   * HİÇ GELMİYOR (bkz. sunucuda lib/biyerlere/kupon.ts). İsteğe bağlı
   * olması bilinçli: uygulamanın yayındaki sürümleri sunucu bayrağını
   * bilmiyor, verinin varlığına bakıp çiziyor. Böylece özellik geri
   * açıldığında yeni sürüm beklemeden yeniden görünüyor.
   */
  sadakat?: {
    damgaSayisi: number;
    esik: number;
    kalanZiyaret: number;
    kazanilanKupon: { id: string; kod: string; indirim: string } | null;
  };
  tamamlananRotalar: { id: string; ad: string; slug: string }[];
  rotaTamamlamaPuani: number;
};
