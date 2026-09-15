/**
 * İşletmenin haftalık çalışma saatleri.
 *
 * Neden gerekliydi: keşfet ekranı mekanları listeliyor, haritada
 * gösteriyor, yol tarifi veriyor — ama kullanıcının sorduğu İLK soruyu
 * ("şu an açık mı?") cevaplayamıyordu.
 *
 * Asıl önemi önkoşul olması: rezervasyon uygulamaya açıldığında kapalı
 * saate rezervasyon alınmasını engelleyecek tek şey bu; etkinlik
 * özelliğinde de "o saatte mekan kapalı" uyarısı buradan gelecek.
 *
 * TASARIM KARARLARI
 *
 * Gün başına TEK aralık: "09:00–23:00". Bölünmüş mesai (öğle arası
 * kapanan esnaf lokantası) bilerek desteklenmiyor — kafe/restoran
 * dünyasında nadir, ve desteklemek hem veri modelini hem arayüzü iki
 * katına çıkarıyor. Gerektiğinde `aralik` alanı diziye çevrilerek
 * eklenebilir; bugünkü veriyi bozmadan.
 *
 * GECE YARISINI GEÇEN KAPANIŞ destekleniyor ve bu şart: bir bar için
 * "20:00–02:00" istisna değil kural. Kapanış açılıştan küçükse ERTESİ
 * GÜN kastediliyor demektir.
 *
 * Saklama biçimi `Business.mekanOzellikleri` ile aynı yaklaşım: tek bir
 * metin sütunu, çözücü/yazıcı çifti. Ayrı tablo daha "doğru" görünürdü
 * ama 56 işletme × 7 gün = 392 satır, ve "şimdi açık" süzgeci zaten
 * bellekte çalışıyor (keşfet sorgusu işletmeleri hâliyle okuyor).
 */

/** Pazartesi = 0 ... Pazar = 6. `Date.getDay()` DEĞİL — orada pazar 0. */
export const GUNLER = [
  "pazartesi",
  "sali",
  "carsamba",
  "persembe",
  "cuma",
  "cumartesi",
  "pazar",
] as const;

export type Gun = (typeof GUNLER)[number];

export const GUN_ADLARI: Record<Gun, string> = {
  pazartesi: "Pazartesi",
  sali: "Salı",
  carsamba: "Çarşamba",
  persembe: "Perşembe",
  cuma: "Cuma",
  cumartesi: "Cumartesi",
  pazar: "Pazar",
};

/** Tek bir günün durumu. Kapalıysa saatler anlamsız. */
export type GunSaati =
  | { kapali: true }
  | { kapali: false; acilis: string; kapanis: string };

export type CalismaSaatleri = Record<Gun, GunSaati>;

const SAAT_DESENI = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** "09:30" → 570 (gün başından beri geçen dakika). Geçersizse null. */
export function dakikayaCevir(saat: string): number | null {
  const e = SAAT_DESENI.exec(saat.trim());
  if (!e) return null;
  return Number(e[1]) * 60 + Number(e[2]);
}

/** `Date.getDay()` (pazar=0) → bizim sıralamamız (pazartesi=0). */
export function gunIndeksi(tarih: Date): number {
  return (tarih.getDay() + 6) % 7;
}

/** Hiç saat tanımlanmamış işletme için: bilinmiyor, kapalı değil. */
export function bosSaatler(): CalismaSaatleri {
  return Object.fromEntries(
    GUNLER.map((g) => [g, { kapali: true } as GunSaati]),
  ) as CalismaSaatleri;
}

/**
 * Saklanan metni çözer. Biçim: `gun:acilis-kapanis` çiftleri, virgülle.
 *
 *     "pazartesi:09:00-23:00,sali:09:00-23:00,pazar:kapali"
 *
 * Listede olmayan gün KAPALI sayılıyor: eksik veriyi "açık" varsaymak,
 * kullanıcıyı kapalı bir mekana göndermek demek — yanlışın pahalı yönü.
 * Bozuk bir parça sessizce atlanıyor; tek hatalı gün yüzünden bütün
 * haftayı kaybetmenin anlamı yok.
 */
export function saatleriCoz(ham: string | null | undefined): CalismaSaatleri {
  const sonuc = bosSaatler();
  if (!ham?.trim()) return sonuc;

  for (const parca of ham.split(",")) {
    const [gunHam, ...kalan] = parca.split(":");
    const gun = gunHam?.trim() as Gun;
    if (!GUNLER.includes(gun)) continue;

    const deger = kalan.join(":").trim();
    if (!deger || deger === "kapali") continue; // zaten kapalı

    const [acilis, kapanis] = deger.split("-").map((s) => s.trim());
    if (!acilis || !kapanis) continue;
    if (dakikayaCevir(acilis) === null || dakikayaCevir(kapanis) === null) continue;
    // Açılış ve kapanış aynıysa aralık sıfır uzunlukta: kapalı demektir.
    if (acilis === kapanis) continue;

    sonuc[gun] = { kapali: false, acilis, kapanis };
  }
  return sonuc;
}

/** Çözücünün tersi. Tamamı kapalıysa null — boş sütun "tanımlanmamış". */
export function saatleriYaz(saatler: CalismaSaatleri): string | null {
  const parcalar = GUNLER.filter((g) => !saatler[g].kapali).map((g) => {
    const s = saatler[g] as { kapali: false; acilis: string; kapanis: string };
    return `${g}:${s.acilis}-${s.kapanis}`;
  });
  return parcalar.length > 0 ? parcalar.join(",") : null;
}

/** Hiç gün tanımlı değil — "kapalı" ile karıştırılmamalı. */
export function saatTanimliMi(saatler: CalismaSaatleri): boolean {
  return GUNLER.some((g) => !saatler[g].kapali);
}

export type AcikDurumu =
  /** Saat hiç girilmemiş; "kapalı" DEMEK DEĞİL. */
  | { durum: "bilinmiyor" }
  | { durum: "acik"; kapanisDakika: number }
  | { durum: "kapali"; sonrakiAcilis: { gun: Gun; saat: string } | null };

/**
 * Verilen anda açık mı?
 *
 * Gece yarısını geçen kapanış (20:00–02:00) iki yerden kontrol ediliyor:
 * bugünün aralığı içinde olabilir (23:00 → evet), ya da DÜNÜN aralığının
 * devamı olabilir (01:00 → dün 20:00'de açılan yer hâlâ açık). İkincisi
 * atlanırsa gece yarısından sonra bütün barlar "kapalı" görünür.
 *
 * Saf: `simdi` dışarıdan veriliyor, böylece "cumartesi 01:30'da ne olur"
 * sorusu gerçek saati beklemeden test edilebiliyor.
 */
export function acikMi(saatler: CalismaSaatleri, simdi: Date): AcikDurumu {
  if (!saatTanimliMi(saatler)) return { durum: "bilinmiyor" };

  const bugunIndeks = gunIndeksi(simdi);
  const suAnDakika = simdi.getHours() * 60 + simdi.getMinutes();

  // 1) Bugünün aralığı
  const bugun = saatler[GUNLER[bugunIndeks]];
  if (!bugun.kapali) {
    const ac = dakikayaCevir(bugun.acilis)!;
    const kap = dakikayaCevir(bugun.kapanis)!;
    if (kap > ac) {
      // Aynı gün içinde kapanıyor.
      if (suAnDakika >= ac && suAnDakika < kap) {
        return { durum: "acik", kapanisDakika: kap - suAnDakika };
      }
    } else if (suAnDakika >= ac) {
      // Gece yarısını geçiyor ve açılıştan sonrasındayız.
      return { durum: "acik", kapanisDakika: 24 * 60 - suAnDakika + kap };
    }
  }

  // 2) DÜNÜN gece yarısını geçen aralığı hâlâ sürüyor olabilir.
  const dun = saatler[GUNLER[(bugunIndeks + 6) % 7]];
  if (!dun.kapali) {
    const ac = dakikayaCevir(dun.acilis)!;
    const kap = dakikayaCevir(dun.kapanis)!;
    if (kap <= ac && suAnDakika < kap) {
      return { durum: "acik", kapanisDakika: kap - suAnDakika };
    }
  }

  return { durum: "kapali", sonrakiAcilis: sonrakiAcilisiBul(saatler, simdi) };
}

/**
 * Bir sonraki açılış — "yarın 09:00'da açılıyor" diyebilmek için.
 *
 * Bugün dahil yedi gün ileri bakıyor; bugünün açılışı henüz gelmediyse
 * onu döndürüyor (sabah 07:00'de bakan kişiye "yarın" demek yanlış olur).
 */
function sonrakiAcilisiBul(
  saatler: CalismaSaatleri,
  simdi: Date,
): { gun: Gun; saat: string } | null {
  const bugunIndeks = gunIndeksi(simdi);
  const suAnDakika = simdi.getHours() * 60 + simdi.getMinutes();

  for (let ileri = 0; ileri < 7; ileri++) {
    const gun = GUNLER[(bugunIndeks + ileri) % 7];
    const g = saatler[gun];
    if (g.kapali) continue;
    const ac = dakikayaCevir(g.acilis)!;
    if (ileri === 0 && ac <= suAnDakika) continue; // bugünün açılışı geçti
    return { gun, saat: g.acilis };
  }
  return null;
}

/**
 * Bir ZAMAN ARALIĞININ tamamı açık saatlere düşüyor mu?
 *
 * Rezervasyon ve etkinlik bunu kullanacak: "cumartesi 21:00'de 2 saatlik
 * rezervasyon alınabilir mi". Başlangıcın açık olması yetmiyor — kapanışa
 * on dakika kala iki saatlik masa vermek, müşteriyi kapıda bırakmak olurdu.
 *
 * Saat tanımlı değilse `true` dönüyor: bilinmeyen bir kısıt yüzünden
 * işletmenin rezervasyon almasını engellemek, yanlışın pahalı yönü.
 */
export function araligaUygunMu(
  saatler: CalismaSaatleri,
  baslangic: Date,
  bitis: Date,
): boolean {
  if (!saatTanimliMi(saatler)) return true;
  if (bitis <= baslangic) return false;

  const basDurum = acikMi(saatler, baslangic);
  if (basDurum.durum !== "acik") return false;

  const sureDakika = Math.ceil((bitis.getTime() - baslangic.getTime()) / 60000);
  return sureDakika <= basDurum.kapanisDakika;
}

/** "09:00 – 23:00" / "Kapalı" — panelde ve mekan sayfasında aynı metin. */
export function gunMetni(g: GunSaati): string {
  return g.kapali ? "Kapalı" : `${g.acilis} – ${g.kapanis}`;
}
