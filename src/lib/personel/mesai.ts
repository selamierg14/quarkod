/**
 * PERSONEL MESAİ TAKİBİ — kim saat kaçta geldi, kaçta çıktı.
 *
 * Akış: mekana asılan QR'ı personel kendi telefonundan okutuyor. Açık
 * kaydı yoksa GİRİŞ, varsa ÇIKIŞ açılıyor — tek düğme, iki anlam.
 * Servis sırasında "hangi düğmeye basacağım" diye düşündürmek, yanlış
 * düğmeye basılmasının en yaygın sebebi.
 *
 * TEK KORUMA IP. QR bir kâğıt: fotoğrafı çekilip evden okutulabilir.
 * Bunu engelleyen tek şey, isteğin işletmenin ağından çıkması. Dolayısıyla
 * IP listesi boşken sistem çalışmıyor — "koruması olmayan bir mesai
 * kaydı", hiç mesai kaydı olmamasından kötü: sayılar doğru sanılıyor.
 *
 * UYDURMA SAAT YOK. Çıkış okutulmadıysa kayıt açık kalıyor ve rapor
 * "çıkış yapmadı" diyor; hiç giriş yoksa "giriş yapmadı". Otomatik
 * kapatma bordroya sessizce yanlış veri yazardı; düzeltmeyi yönetici
 * bilerek ve iz bırakarak yapıyor.
 *
 * Saf: veritabanına ve Next'e dokunmuyor, `simdi` dışarıdan veriliyor.
 */

export type MesaiKaydiOzeti = {
  id: string;
  userId: string;
  giris: Date;
  cikis: Date | null;
};

// --- IP kontrolü -----------------------------------------------------

/**
 * İzinli IP listesini çözer.
 *
 * Nokta ya da iki nokta ile biten değer ÖNEK sayılıyor: kafelerin genel
 * IP'si çoğunlukla dinamik ve modem her açılışta son haneyi
 * değiştiriyor. "85.105.10." yazmak o bloğun tamamını kabul ediyor —
 * tek tek IP yazmak, personelin sabah giriş yapamamasıyla sonuçlanan
 * haftalık bir bakım işine dönüşürdü.
 */
export function ipleriCoz(ham: string | null | undefined): string[] {
  if (!ham) return [];
  return ham
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter((p) => p.length > 0);
}

export function ipleriYaz(ipler: string[]): string | null {
  const temiz = [...new Set(ipler.map((i) => i.trim().toLowerCase()).filter(Boolean))];
  return temiz.length > 0 ? temiz.join(",") : null;
}

/**
 * İstekteki IP işletmenin ağından mı geliyor?
 *
 * `guvenilmez` özel bir değer: üretimde güvenilir bir IP başlığı
 * tanımlanmamışsa `istemciIp` bunu döndürüyor (bkz. lib/kimlik/
 * istemci-ip.ts). O durumda HİÇBİR kayıt açılmamalı — yoksa IP kontrolü
 * varmış gibi görünüp herkesi kabul eden bir kapı olurdu.
 */
export function ipIzinliMi(izinliler: string[], ip: string): boolean {
  if (izinliler.length === 0) return false;
  if (!ip || ip === "guvenilmez") return false;

  const gelen = ip.trim().toLowerCase();
  return izinliler.some((izinli) =>
    izinli.endsWith(".") || izinli.endsWith(":")
      ? gelen.startsWith(izinli)
      : gelen === izinli,
  );
}

// --- Okutma kararı ---------------------------------------------------

export type OkutmaKarari =
  | { sonuc: "giris" }
  | { sonuc: "cikis"; kayitId: string; calisilanDakika: number }
  | { sonuc: "red"; neden: OkutmaRedNedeni; mesaj: string };

export type OkutmaRedNedeni =
  | "kurulum-eksik"
  | "ip-disarida"
  | "ip-tespit-edilemiyor"
  | "cok-hizli";

/**
 * Aynı kaydın iki kez okutulmasını engelleyen en kısa süre.
 *
 * 60 saniye: QR'ı okutup ekranın açıldığını görmeyen personel ikinci kez
 * okutuyor ve az önce açtığı girişi hemen kapatıyor. Bu pencere içindeki
 * ikinci okutma "çıkış" değil, kazara tekrar sayılıyor.
 */
export const EN_KISA_ARALIK_SN = 60;

export function okutmaKarari(girdi: {
  izinliIpler: string[];
  ip: string;
  acikKayit: MesaiKaydiOzeti | null;
  simdi?: Date;
}): OkutmaKarari {
  const simdi = girdi.simdi ?? new Date();

  if (girdi.izinliIpler.length === 0) {
    return {
      sonuc: "red",
      neden: "kurulum-eksik",
      mesaj:
        "Mesai takibi henüz kurulmamış: yöneticinin işletmenin ağından " +
        "'Bu ağdan kaydet' demesi gerekiyor.",
    };
  }

  if (!girdi.ip || girdi.ip === "guvenilmez") {
    return {
      sonuc: "red",
      neden: "ip-tespit-edilemiyor",
      mesaj:
        "Bağlantının kaynağı doğrulanamadı; bu sunucuda mesai takibi " +
        "çalışmıyor. Yöneticinize bildirin.",
    };
  }

  if (!ipIzinliMi(girdi.izinliIpler, girdi.ip)) {
    return {
      sonuc: "red",
      neden: "ip-disarida",
      mesaj:
        "İşletmenin internet ağında değilsiniz. Telefonunuzu mekanın " +
        "Wi-Fi'ına bağlayıp tekrar deneyin.",
    };
  }

  if (!girdi.acikKayit) return { sonuc: "giris" };

  const gecenSn = (simdi.getTime() - girdi.acikKayit.giris.getTime()) / 1000;
  if (gecenSn < EN_KISA_ARALIK_SN) {
    return {
      sonuc: "red",
      neden: "cok-hizli",
      mesaj: "Girişiniz az önce alındı. Çıkış için mesai sonunda tekrar okutun.",
    };
  }

  return {
    sonuc: "cikis",
    kayitId: girdi.acikKayit.id,
    calisilanDakika: Math.round(gecenSn / 60),
  };
}

// --- Süre ve rapor ---------------------------------------------------

/** Kapanmamış kayıtta null — açık bir kaydın "süresi" yok, tahmini olur. */
export function calisilanDakika(kayit: MesaiKaydiOzeti): number | null {
  if (!kayit.cikis) return null;
  return Math.max(0, Math.round((kayit.cikis.getTime() - kayit.giris.getTime()) / 60000));
}

/** 435 → "7s 15dk" — bordroda ondalık saat kimseye bir şey anlatmıyor. */
export function sureMetni(dakika: number | null): string {
  if (dakika === null) return "—";
  const saat = Math.floor(dakika / 60);
  const kalan = dakika % 60;
  if (saat === 0) return `${kalan}dk`;
  return kalan === 0 ? `${saat}s` : `${saat}s ${kalan}dk`;
}

export type PersonelDurumu =
  /** Girişi var, çıkışı da var. */
  | "tamam"
  /** Şu an içeride — kayıt açık ve giriş bugün. */
  | "icerde"
  /** Kayıt açık ama gün kapanmış: çıkış okutulmamış. */
  | "cikis-yapmadi"
  /** Vardiyası planlı ama hiç kaydı yok. */
  | "giris-yapmadi";

export type GunlukSatir = {
  userId: string;
  ad: string;
  /** Planlı vardiya (varsa) — "20:00 vardiyasına 20:35'te geldi" için. */
  vardiya: string | null;
  ilkGiris: Date | null;
  sonCikis: Date | null;
  toplamDakika: number | null;
  durum: PersonelDurumu;
  kayitSayisi: number;
};

/**
 * Bir günün personel tablosu.
 *
 * Kayıtlar VE planlı vardiyalar birlikte veriliyor: rapor yalnızca
 * kayıtlara baksaydı, "giriş yapmadı" satırı hiç oluşmazdı — oysa
 * raporun asıl sorusu o. Vardiyası olmayan ama gelip okutan kişi de
 * listede duruyor (vardiya: null).
 *
 * Aynı kişinin aynı gün birden çok kaydı olabilir (öğle arası çıkıp
 * dönmek): toplam süre hepsinin toplamı, ilk giriş ve son çıkış uçlar.
 */
export function gunlukTablo(girdi: {
  kayitlar: (MesaiKaydiOzeti & { ad: string })[];
  planlananlar: { userId: string; ad: string; vardiya: string }[];
  /** Günün sonu geçti mi — "içerde" ile "çıkış yapmadı"yı bu ayırıyor. */
  gunBitti: boolean;
}): GunlukSatir[] {
  const satirlar = new Map<string, GunlukSatir>();

  for (const plan of girdi.planlananlar) {
    satirlar.set(plan.userId, {
      userId: plan.userId,
      ad: plan.ad,
      vardiya: plan.vardiya,
      ilkGiris: null,
      sonCikis: null,
      toplamDakika: null,
      durum: "giris-yapmadi",
      kayitSayisi: 0,
    });
  }

  for (const kayit of girdi.kayitlar) {
    const mevcut = satirlar.get(kayit.userId) ?? {
      userId: kayit.userId,
      ad: kayit.ad,
      vardiya: null,
      ilkGiris: null,
      sonCikis: null,
      toplamDakika: null,
      durum: "tamam" as PersonelDurumu,
      kayitSayisi: 0,
    };

    mevcut.kayitSayisi += 1;
    mevcut.ilkGiris =
      mevcut.ilkGiris === null || kayit.giris < mevcut.ilkGiris ? kayit.giris : mevcut.ilkGiris;

    const sure = calisilanDakika(kayit);
    if (sure !== null) {
      mevcut.toplamDakika = (mevcut.toplamDakika ?? 0) + sure;
      if (mevcut.sonCikis === null || kayit.cikis! > mevcut.sonCikis) {
        mevcut.sonCikis = kayit.cikis;
      }
    }

    // Açık kayıt son sözü söylüyor: gün bittiyse eksik, bitmediyse içerde.
    mevcut.durum = kayit.cikis === null
      ? girdi.gunBitti
        ? "cikis-yapmadi"
        : "icerde"
      : mevcut.durum === "giris-yapmadi" || mevcut.durum === "tamam"
        ? "tamam"
        : mevcut.durum;

    satirlar.set(kayit.userId, mevcut);
  }

  return [...satirlar.values()].sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
}

export const DURUM_METNI: Record<PersonelDurumu, string> = {
  tamam: "Tamam",
  icerde: "İçeride",
  "cikis-yapmadi": "Çıkış yapmadı",
  "giris-yapmadi": "Giriş yapmadı",
};

/** Yöneticinin ilgilenmesi gereken satırlar — raporun üstündeki uyarı. */
export function duzeltilmesiGerekenler(satirlar: GunlukSatir[]): GunlukSatir[] {
  return satirlar.filter(
    (s) => s.durum === "cikis-yapmadi" || s.durum === "giris-yapmadi",
  );
}

/** Elle düzeltme geçerli mi — çıkış girişten önce olamaz. */
export function duzeltmeGecerliMi(
  giris: Date,
  cikis: Date | null,
): { ok: true } | { ok: false; hata: string } {
  if (Number.isNaN(giris.getTime())) return { ok: false, hata: "Giriş saati geçersiz." };
  if (cikis === null) return { ok: true };
  if (Number.isNaN(cikis.getTime())) return { ok: false, hata: "Çıkış saati geçersiz." };
  if (cikis <= giris) return { ok: false, hata: "Çıkış, girişten sonra olmalı." };
  // 24 saatten uzun bir mesai, düzeltmede yapılan yazım hatasının en sık
  // hali (yanlış gün seçmek). Bordroya gitmeden önce durduruluyor.
  if (cikis.getTime() - giris.getTime() > 24 * 60 * 60 * 1000) {
    return { ok: false, hata: "Tek kayıt 24 saatten uzun olamaz; tarihleri kontrol edin." };
  }
  return { ok: true };
}
