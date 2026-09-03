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
    cuzdandakiKupon: number;
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
