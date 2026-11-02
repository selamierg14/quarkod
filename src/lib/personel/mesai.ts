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

  const gelen = adresiCoz(ip);
  if (!gelen) return false;

  return izinliler.some((ham) => {
    const izinli = ham.trim().toLowerCase();
    if (gelen.tur === "v4") {
      return izinli.endsWith(".") ? gelen.metin.startsWith(izinli) : gelen.metin === izinli;
    }
    // IPv6 metin olarak karşılaştırılamıyor: aynı adres "2a02:ff0::1" ve
    // "2a02:0ff0:0:0:0:0:0:1" diye iki ayrı biçimde yazılabiliyor. Grup
    // grup açılmış hâlleri karşılaştırılıyor.
    if (izinli.endsWith(":") && !izinli.endsWith("::")) {
      const onek = izinli.slice(0, -1).split(":").map(sifirlariAt);
      return onek.every((g, i) => g === gelen.gruplar[i]);
    }
    const tam = ipv6Gruplari(izinli);
    return tam !== null && tam.join(":") === gelen.gruplar.join(":");
  });
}

// --- Elle girilen IP listesinin doğrulanması --------------------------

/**
 * İşletme başına en fazla kaç adres/blok. Her okutmada liste baştan sona
 * taranıyor; sınırsız liste tek bir ayarla sorguyu ağırlaştırmanın yolu
 * olurdu. Bir mekan için 20, yedek hat dahil fazlasıyla yeterli.
 */
export const EN_COK_IP = 20;

/** Ham metin üst sınırı — 20 IPv6 adresi rahat sığar. */
const EN_COK_GIRDI = 2000;

const OKTET = "(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)";
const IPV4 = new RegExp(`^${OKTET}(\\.${OKTET}){3}$`);
const IPV4_BLOK = new RegExp(`^${OKTET}(\\.${OKTET}){2}\\.$`);
const IPV4_GENIS_BLOK = new RegExp(`^${OKTET}(\\.${OKTET})?\\.$`);
const IPV4_ESLENMIS = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/;

/**
 * En az kaç IPv6 grubu yazılmalı. 4 grup = /64, yani tek bir hat.
 * Daha kısa önek bir operatörün binlerce müşterisini kapsar.
 */
const IPV6_EN_AZ_GRUP = 4;

function sifirlariAt(grup: string): string {
  return grup.replace(/^0+(?=.)/, "");
}

/** IPv6 adresini 8 gruba açar ("::" kısaltmasını çözer); geçersizse null. */
function ipv6Gruplari(ip: string): string[] | null {
  const s = ip.toLowerCase();
  if (!/^[0-9a-f:]+$/.test(s)) return null;
  const parcalar = s.split("::");
  if (parcalar.length > 2) return null;
  const bol = (p: string) => (p === "" ? [] : p.split(":"));
  const bas = bol(parcalar[0]);
  const son = parcalar.length === 2 ? bol(parcalar[1]) : [];
  let gruplar: string[];
  if (parcalar.length === 2) {
    if (bas.length + son.length > 7) return null;
    gruplar = [...bas, ...Array<string>(8 - bas.length - son.length).fill("0"), ...son];
  } else {
    gruplar = bas;
  }
  if (gruplar.length !== 8) return null;
  if (!gruplar.every((g) => /^[0-9a-f]{1,4}$/.test(g))) return null;
  return gruplar.map(sifirlariAt);
}

type CozulmusAdres = { tur: "v4"; metin: string } | { tur: "v6"; gruplar: string[] };

/**
 * İstekten gelen adresi çözer. "::ffff:85.105.10.42" biçimi (bazı
 * vekil sunucular IPv4'ü böyle iletiyor) düz IPv4'e çevriliyor; yoksa
 * IPv4 listesine yazılmış bir kafe hiç eşleşmezdi.
 */
function adresiCoz(ip: string): CozulmusAdres | null {
  const s = ip.trim().toLowerCase();
  const eslenmis = IPV4_ESLENMIS.exec(s);
  const v4 = eslenmis ? eslenmis[1] : s;
  if (IPV4.test(v4)) return { tur: "v4", metin: v4 };
  const gruplar = ipv6Gruplari(s);
  return gruplar ? { tur: "v6", gruplar } : null;
}

export type IpGirdisi = { ok: true; deger: string } | { ok: false; neden: string };

/**
 * Tek bir girdiyi doğrular ve kayıt biçimine getirir.
 *
 * Kabul edilenler:
 *   - tam IPv4             85.105.10.42
 *   - IPv4 bloğu (/24)     85.105.10.
 *   - tam IPv6             2a02:ff0::1        → açılmış biçimde saklanır
 *   - IPv6 öneki (≥ /64)   2a02:ff0:12:34:
 *
 * Bilerek REDDEDİLENLER: "85." ya da "85.105." gibi geniş bloklar. Bunlar
 * yüz binlerce, milyonlarca adresi kabul eder; mesai kaydının tek
 * koruması IP olduğu için bu, korumayı sessizce kaldırmak demek.
 */
export function ipGirdisiniSadelestir(ham: string): IpGirdisi {
  const s = ham.trim().toLowerCase();
  if (!s) return { ok: false, neden: "boş" };

  const eslenmis = IPV4_ESLENMIS.exec(s);
  if (eslenmis && IPV4.test(eslenmis[1])) return { ok: true, deger: eslenmis[1] };
  if (IPV4.test(s) || IPV4_BLOK.test(s)) return { ok: true, deger: s };
  if (IPV4_GENIS_BLOK.test(s)) {
    return { ok: false, neden: "blok çok geniş, en az üç hane yazın (ör. 85.105.10.)" };
  }

  if (s.includes(":")) {
    if (s.endsWith(":") && !s.endsWith("::")) {
      const gruplar = s.slice(0, -1).split(":");
      if (!gruplar.every((g) => /^[0-9a-f]{1,4}$/.test(g)) || gruplar.length > 7) {
        return { ok: false, neden: "geçerli bir IPv6 öneki değil" };
      }
      if (gruplar.length < IPV6_EN_AZ_GRUP) {
        return { ok: false, neden: "IPv6 öneki çok geniş, en az dört grup yazın" };
      }
      return { ok: true, deger: gruplar.map(sifirlariAt).join(":") + ":" };
    }
    const gruplar = ipv6Gruplari(s);
    return gruplar
      ? { ok: true, deger: gruplar.join(":") }
      : { ok: false, neden: "geçerli bir IPv6 adresi değil" };
  }

  return { ok: false, neden: "geçerli bir IP adresi değil" };
}

export type IpListesi = { ok: true; ipler: string[] } | { ok: false; hata: string };

/**
 * Elle girilen listeyi doğrular. Ayraç olarak virgül, boşluk, noktalı
 * virgül ve satır sonu kabul ediliyor: insanlar adresleri modem
 * ekranından kopyalayıp alt alta yapıştırıyor. Önceden yalnızca virgül
 * ayraçtı ve "1.2.3.4 5.6.7.8" tek, hiçbir şeyle eşleşmeyen bir kayıt
 * olarak sessizce saklanıyordu.
 *
 * Tek bir hatalı değer bile varsa HİÇBİRİ kaydedilmiyor: yarısı
 * kaydedilmiş bir liste, yöneticinin "kaydettim" sanıp personelin
 * sabah kapıda kalmasıyla sonuçlanır.
 */
export function ipListesiniDogrula(ham: string | null | undefined): IpListesi {
  const metin = ham ?? "";
  if (metin.length > EN_COK_GIRDI) return { ok: false, hata: "Liste çok uzun." };

  const ipler: string[] = [];
  const hatalar: string[] = [];
  for (const parca of metin.split(/[\s,;]+/).filter(Boolean)) {
    const sonuc = ipGirdisiniSadelestir(parca);
    if (sonuc.ok) ipler.push(sonuc.deger);
    else hatalar.push(`"${parca.slice(0, 45)}" ${sonuc.neden}`);
  }

  if (hatalar.length > 0) {
    const ilk = hatalar.slice(0, 3).join("; ");
    const kalan = hatalar.length > 3 ? ` (ve ${hatalar.length - 3} değer daha)` : "";
    return { ok: false, hata: `Kaydedilmedi: ${ilk}${kalan}.` };
  }

  const tekil = [...new Set(ipler)];
  if (tekil.length > EN_COK_IP) {
    return { ok: false, hata: `En fazla ${EN_COK_IP} adres/blok tanımlanabilir.` };
  }
  return { ok: true, ipler: tekil };
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
