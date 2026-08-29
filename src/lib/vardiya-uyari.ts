import { SHIFTS, type Shift } from "./constants";
import { gunGirdisi } from "./gun";

/**
 * Çizelge kurulurken göze çarpmayan sorunlar.
 *
 * Yönetici hücre hücre atama yaparken bütünü göremiyor: gece vardiyasından
 * çıkıp ertesi sabah açılışa kalan biri, yedi gün üst üste çalışan biri ya
 * da hiç kimsenin yazılmadığı bir vardiya ancak hafta başlayınca fark
 * ediliyor. Bunlar kaydı ENGELLEMİYOR — işletme bilerek böyle planlamış
 * olabilir; yalnızca görünür kılınıyor.
 *
 * Saf tutuldu: kural mantığı ekrandan ve veritabanından bağımsız test
 * edilebilsin.
 */

export type UyariTuru = "dinlenme" | "aralikszCalisma" | "bosVardiya";

export type VardiyaUyarisi = {
  tur: UyariTuru;
  /** Kime ait; boş vardiya uyarısında kimse yok. */
  userId?: string;
  ad?: string;
  /** İlgili gün (yyyy-aa-gg). */
  gun: string;
  shift?: Shift;
  mesaj: string;
};

export type AtamaGirdisi = {
  userId: string;
  ad: string;
  date: Date;
  shift: string;
};

/**
 * Gece vardiyasından sonra ertesi sabah/öğle vardiyasına yazılmak.
 *
 * Vardiya başlangıç saatleri işletmeye göre değişse de sıralama sabit:
 * gece en son başlar, sabah en erken. "Gece → ertesi gün sabah" bu yüzden
 * saat hesabı yapmadan, doğrudan bu iki etiketten yakalanabiliyor.
 */
const YETERSIZ_DINLENME: Partial<Record<Shift, Shift[]>> = {
  gece: ["sabah", "ogle"],
  aksam: ["sabah"],
};

/** Bu kadar gün üst üste çalışma uyarı eşiği. */
const ARALIKSIZ_ESIK = 6;

export function vardiyaUyarilariniHesapla(
  atamalar: AtamaGirdisi[],
  gunler: Date[],
  etkinVardiyalar: Shift[],
): VardiyaUyarisi[] {
  const uyarilar: VardiyaUyarisi[] = [];
  const gunAnahtarlari = gunler.map(gunGirdisi);

  // userId -> gün -> o gün atandığı vardiyalar
  const kisiGun = new Map<string, Map<string, Shift[]>>();
  const adlar = new Map<string, string>();

  for (const atama of atamalar) {
    if (!(atama.shift in SHIFTS)) continue;
    const shift = atama.shift as Shift;
    const gun = gunGirdisi(atama.date);
    adlar.set(atama.userId, atama.ad);

    const gunler = kisiGun.get(atama.userId) ?? new Map<string, Shift[]>();
    const liste = gunler.get(gun) ?? [];
    liste.push(shift);
    gunler.set(gun, liste);
    kisiGun.set(atama.userId, gunler);
  }

  for (const [userId, gunHaritasi] of kisiGun) {
    const ad = adlar.get(userId) ?? "";

    // 1) Yetersiz dinlenme: bir gün X, ertesi gün Y.
    for (let i = 0; i < gunAnahtarlari.length - 1; i++) {
      const bugun = gunHaritasi.get(gunAnahtarlari[i]) ?? [];
      const yarin = gunHaritasi.get(gunAnahtarlari[i + 1]) ?? [];
      for (const oncekiShift of bugun) {
        const riskli = YETERSIZ_DINLENME[oncekiShift] ?? [];
        for (const sonrakiShift of yarin) {
          if (!riskli.includes(sonrakiShift)) continue;
          uyarilar.push({
            tur: "dinlenme",
            userId,
            ad,
            gun: gunAnahtarlari[i + 1],
            shift: sonrakiShift,
            mesaj:
              `${ad}: ${SHIFTS[oncekiShift].toLocaleLowerCase("tr")} vardiyasından ` +
              `sonra ertesi gün ${SHIFTS[sonrakiShift].toLocaleLowerCase("tr")} — ` +
              `dinlenme süresi kısa.`,
          });
        }
      }
    }

    // 2) Aralıksız çalışma: pencere içinde arka arkaya çalışılan gün sayısı.
    let seri = 0;
    let seriBasi = 0;
    for (let i = 0; i < gunAnahtarlari.length; i++) {
      const calisiyor = (gunHaritasi.get(gunAnahtarlari[i]) ?? []).length > 0;
      if (calisiyor) {
        if (seri === 0) seriBasi = i;
        seri++;
      }
      const seriBitti = !calisiyor || i === gunAnahtarlari.length - 1;
      if (seriBitti && seri >= ARALIKSIZ_ESIK) {
        uyarilar.push({
          tur: "aralikszCalisma",
          userId,
          ad,
          gun: gunAnahtarlari[seriBasi],
          mesaj: `${ad}: ${seri} gün üst üste çalışıyor.`,
        });
      }
      if (!calisiyor) seri = 0;
    }
  }

  // 3) Boş vardiya: hiç kimsenin atanmadığı gün×vardiya.
  for (const gun of gunAnahtarlari) {
    for (const shift of etkinVardiyalar) {
      const doluMu = atamalar.some(
        (a) => gunGirdisi(a.date) === gun && a.shift === shift,
      );
      if (doluMu) continue;
      uyarilar.push({
        tur: "bosVardiya",
        gun,
        shift,
        mesaj: `${SHIFTS[shift]} vardiyasına kimse atanmadı.`,
      });
    }
  }

  return uyarilar;
}

/** Uyarıları hücre anahtarına ("gün:vardiya") göre gruplar. */
export function uyarilariHucreyeDagit(
  uyarilar: VardiyaUyarisi[],
): Map<string, VardiyaUyarisi[]> {
  const harita = new Map<string, VardiyaUyarisi[]>();
  for (const uyari of uyarilar) {
    if (!uyari.shift) continue;
    const anahtar = `${uyari.gun}:${uyari.shift}`;
    const liste = harita.get(anahtar) ?? [];
    liste.push(uyari);
    harita.set(anahtar, liste);
  }
  return harita;
}

/** Bir kişinin bir uyarı türündeki tüm uyarıları, tek satırda özetlenmiş. */
export type UyariOzeti = {
  ad: string;
  tur: UyariTuru;
  /** Kaç kez tekrarladığı — "4 gün" gibi bir sayıya karşılık gelir. */
  adet: number;
  /** Kısa özet satırı: "ahmet agmet — 4 kez kısa dinlenme". */
  baslik: string;
  /** Açılınca görünen tekil uyarılar. */
  detaylar: string[];
};

const TUR_ADLARI: Record<UyariTuru, string> = {
  dinlenme: "kısa dinlenme",
  aralikszCalisma: "aralıksız çalışma",
  bosVardiya: "boş vardiya",
};

/**
 * Uyarıları kişi + tür bazında gruplar.
 *
 * Çizelge ekranı bunları düz bir madde listesi olarak basıyordu ve aynı
 * cümle aynı kişi için dört kez alt alta tekrarlanabiliyordu ("ahmet
 * agmet: akşam vardiyasından sonra ertesi gün sabah" ×4). Sekiz maddelik
 * bir sarı blok, içindeki tek gerçek bilgiyi (kaç kişi, kaç sorun)
 * gizliyordu. Gruplama o bilgiyi başlığa çıkarıyor, tekilleri detaya
 * indiriyor.
 *
 * Sıralama en çok tekrarlayandan aza: en çok yüklenen kişi en üstte.
 */
export function uyarilariGrupla(uyarilar: VardiyaUyarisi[]): UyariOzeti[] {
  const gruplar = new Map<string, UyariOzeti>();

  for (const uyari of uyarilar) {
    if (uyari.tur === "bosVardiya") continue;
    const ad = uyari.ad ?? "—";
    const anahtar = `${uyari.userId ?? ad}|${uyari.tur}`;

    const mevcut = gruplar.get(anahtar);
    if (mevcut) {
      mevcut.adet += 1;
      mevcut.detaylar.push(uyari.mesaj);
      continue;
    }
    gruplar.set(anahtar, {
      ad,
      tur: uyari.tur,
      adet: 1,
      baslik: "",
      detaylar: [uyari.mesaj],
    });
  }

  return [...gruplar.values()]
    .map((grup) => ({
      ...grup,
      // Tek seferlik bir uyarıda "1 kez" demek gürültü; sayı yalnızca
      // gerçekten tekrarladığında bilgi taşıyor.
      baslik:
        grup.adet > 1
          ? `${grup.ad} — ${grup.adet} kez ${TUR_ADLARI[grup.tur]}`
          : `${grup.ad} — ${TUR_ADLARI[grup.tur]}`,
    }))
    .sort((a, b) => b.adet - a.adet || a.ad.localeCompare(b.ad, "tr"));
}
