import {
  araligaUygunMu,
  type CalismaSaatleri,
} from "../isletme/calisma-saati";
import {
  cakismaBul,
  VARSAYILAN_SURE_DAKIKA,
  type MevcutRezervasyon,
  type ZamanAraligi,
} from "../isletme/rezervasyon";

/**
 * UYGULAMADAN MASA REZERVASYONU — tüketici tarafının kuralları.
 *
 * Panel tarafı (lib/isletme/rezervasyon.ts) zaten çakışmayı, kapasiteyi
 * ve durumları biliyor. Burada EKSİK olan tek şey vardı: panelde masayı
 * personel seçiyor, uygulamada ise kullanıcı masa numarası bilmiyor ve
 * bilmemeli. Kullanıcı yalnızca üç şey söylüyor — kaç kişi, hangi gün,
 * saat kaçta — masayı sistem buluyor.
 *
 * Bu dosya SAF: veritabanına dokunmuyor, `simdi` dışarıdan veriliyor.
 * Sebebi "cumartesi 23:30'da müsait saat listesi ne olur" sorusunun
 * gerçek saati beklemeden cevaplanabilmesi.
 */

/** Saat seçeneklerinin aralığı. */
export const SLOT_DAKIKA = 30;

/**
 * Bir "günün" kaçta başladığı — takvim günü değil, İŞLETME günü.
 *
 * Gece 01:00'de başlayan bir oturum takvimde ertesi güne düşüyor ama
 * kimse ona "salı" demiyor; pazartesi gecesi deniyor. Gün 06:00'da
 * başlatılınca pazartesi listesi 06:00'dan salı 06:00'a kadar uzuyor ve
 * bar saatleri doğru başlığın altında çıkıyor.
 *
 * Pencereler birbirine tam oturduğu için hiçbir saat iki günde birden ya
 * da hiçbir günde görünmüyor.
 */
export const GUN_BASI_SAAT = 6;

/**
 * En erken ne kadar sonrasına rezervasyon alınabilir.
 *
 * 60 dakika: bundan yakını zaten "kapıdan girme" (walk-in) ve mekanın
 * onay vermesine vakti kalmıyor. Talep "bekliyor" durumunda açıldığı
 * için onaysız bir kaydın müşteriyi kapıya götürmesi en kötü sonuç.
 */
export const EN_ERKEN_DAKIKA = 60;

/** En geç kaç gün sonrası. Ötesi mekanın planını bağlar. */
export const EN_GEC_GUN = 30;

/**
 * Kullanıcı başına aynı anda açık talep sayısı.
 *
 * Buluşmalardaki (lib/biyerlere/etkinlik.ts) üç sınırıyla aynı gerekçe:
 * iptal etmeyi unutan bir kullanıcı, mekanın en iyi masalarını haftalarca
 * meşgul edebiliyor. "Gelmedi" işareti işletmenin elinde ama zarar çoktan
 * oluşmuş oluyor.
 */
export const EN_COK_ACIK_TALEP = 3;

/**
 * Uygulamadan rezerve edilebilecek en büyük grup.
 *
 * 12 kişi üstü masa birleştirme, düzen değişikliği ve çoğu yerde ön
 * görüşme demek; bunu otomatik onaya bırakmak işletmeyi hazırlıksız
 * yakalar. Büyük grup mekanı arasın diye telefon numarası gösteriliyor.
 */
export const EN_COK_KISI = 12;

export type MasaBilgisi = {
  id: string;
  kapasite: number;
  aktif: boolean;
};

export type Karar<T> = { ok: true; deger: T } | { ok: false; hata: string };

/** Kişi sayısı — gövdeden geldiği gibi, güvenilmez. */
export function kisiSayisiCoz(ham: unknown): Karar<number> {
  const sayi = typeof ham === "number" ? ham : Number(String(ham ?? "").trim());
  if (!Number.isInteger(sayi) || sayi < 1) {
    return { ok: false, hata: "Kaç kişi olduğunuzu seçin." };
  }
  if (sayi > EN_COK_KISI) {
    return {
      ok: false,
      hata: `Uygulamadan en fazla ${EN_COK_KISI} kişilik rezervasyon yapılabilir. Daha kalabalık bir grup için mekanı arayın.`,
    };
  }
  return { ok: true, deger: sayi };
}

/**
 * Başlangıç anı. ISO metin bekleniyor (istemci yerel saati gönderiyor).
 *
 * `etkinlik.ts`'teki `baslangicCoz` ile aynı kalıp; sınırlar farklı
 * olduğu için ayrı: buluşma 60 gün ileriye açılabiliyor, rezervasyon 30.
 */
export function baslangicCoz(ham: unknown, simdi: Date): Karar<Date> {
  if (typeof ham !== "string" || ham.trim() === "") {
    return { ok: false, hata: "Saat seçin." };
  }
  const tarih = new Date(ham);
  if (Number.isNaN(tarih.getTime())) {
    return { ok: false, hata: "Saat okunamadı." };
  }

  const enErken = new Date(simdi.getTime() + EN_ERKEN_DAKIKA * 60 * 1000);
  if (tarih < enErken) {
    return {
      ok: false,
      hata: `En az ${EN_ERKEN_DAKIKA} dakika sonrası için rezervasyon yapılabilir.`,
    };
  }

  const enGec = new Date(simdi.getTime() + EN_GEC_GUN * 24 * 60 * 60 * 1000);
  if (tarih > enGec) {
    return { ok: false, hata: `En fazla ${EN_GEC_GUN} gün sonrası için yer ayırtabilirsiniz.` };
  }

  return { ok: true, deger: tarih };
}

export type TalepKarari = { izin: true } | { izin: false; mesaj: string };

export function talepAcabilirMi(acikTalepSayisi: number): TalepKarari {
  if (acikTalepSayisi >= EN_COK_ACIK_TALEP) {
    return {
      izin: false,
      mesaj: `Aynı anda en fazla ${EN_COK_ACIK_TALEP} açık rezervasyonun olabilir. Birini iptal edip tekrar dene.`,
    };
  }
  return { izin: true };
}

/** Başlangıçtan süreye göre aralık. */
export function araligaCevir(
  baslangic: Date,
  sureDakika: number = VARSAYILAN_SURE_DAKIKA,
): ZamanAraligi {
  return {
    baslangic,
    bitis: new Date(baslangic.getTime() + sureDakika * 60 * 1000),
  };
}

/**
 * Gruba uygun BOŞ masayı seçer — yoksa null.
 *
 * "En küçük yeterli masa" sıralaması bilinçli: iki kişiye sekizlik masayı
 * vermek, akşamın ilerleyen saatinde gelecek kalabalık grubun yerini
 * yemek demek. Personel panelden istediği masaya taşıyabiliyor; buradaki
 * seçim iyi bir varsayılan, son söz değil.
 *
 * Masa BİRLEŞTİRME bilerek yapılmıyor: hangi masaların yan yana olduğunu
 * sistem bilmiyor (kat planındaki konum yaklaşık), ve uzak iki masayı tek
 * gruba vermek müşteriyi masaya oturunca şaşırtır. Tek masaya sığmayan
 * grup mekanı arıyor.
 */
export function uygunMasaSec(
  masalar: MasaBilgisi[],
  kisiSayisi: number,
  aralik: ZamanAraligi,
  mevcutlar: MevcutRezervasyon[],
): string | null {
  const adaylar = masalar
    .filter((m) => m.aktif && m.kapasite >= kisiSayisi)
    .sort((a, b) => a.kapasite - b.kapasite || a.id.localeCompare(b.id));

  for (const masa of adaylar) {
    const cakisma = cakismaBul({ ...aralik, masaIdleri: [masa.id] }, mevcutlar);
    if (!cakisma.cakisiyor) return masa.id;
  }
  return null;
}

export type MusaitSaat = {
  /** "19:30" — listede gösterilen etiket. */
  etiket: string;
  /** Sunucuya geri gönderilecek tam an. */
  baslangic: Date;
};

/**
 * Bir GÜNÜN müsait saatleri.
 *
 * Üç kapıdan geçiyor: (1) mekan o aralıkta açık mı — kapanışa yarım saat
 * kala iki saatlik masa vermek müşteriyi kapıda bırakır, `araligaUygunMu`
 * bunu zaten biliyor; (2) en erken sınırı geçmiş mi; (3) o aralıkta
 * gruba yetecek boş masa kalmış mı.
 *
 * Boş liste "mekan kapalı" ile "her yer dolu"yu ayırmıyor — ayrımı
 * çağıran yapıyor, çünkü mesajı yazacak olan o.
 */
export function musaitSaatler(girdi: {
  saatler: CalismaSaatleri;
  masalar: MasaBilgisi[];
  mevcutlar: MevcutRezervasyon[];
  /** Yerel gün başlangıcı (00:00). */
  gun: Date;
  kisiSayisi: number;
  simdi: Date;
  sureDakika?: number;
}): MusaitSaat[] {
  const {
    saatler,
    masalar,
    mevcutlar,
    gun,
    kisiSayisi,
    simdi,
    sureDakika = VARSAYILAN_SURE_DAKIKA,
  } = girdi;

  const enErken = new Date(simdi.getTime() + EN_ERKEN_DAKIKA * 60 * 1000);
  const enGec = new Date(simdi.getTime() + EN_GEC_GUN * 24 * 60 * 60 * 1000);
  const sonuc: MusaitSaat[] = [];

  /**
   * 06:00'dan başlayıp 30'ar dakikayla 24 saat taranıyor (bkz.
   * GUN_BASI_SAAT). Gece yarısını geçen kapanışı (20:00–02:00)
   * `araligaUygunMu` kendisi çözüyor.
   *
   * Zaman milisaniye eklenerek değil takvimden kuruluyor: yaz saati
   * uygulanan bir ülkede 24 saat her zaman 24 saat etmiyor ve o gün
   * bütün etiketler bir saat kayardı.
   */
  const adimSayisi = (24 * 60) / SLOT_DAKIKA;
  for (let i = 0; i < adimSayisi; i++) {
    const baslangic = new Date(
      gun.getFullYear(),
      gun.getMonth(),
      gun.getDate(),
      0,
      GUN_BASI_SAAT * 60 + i * SLOT_DAKIKA,
    );
    if (baslangic < enErken || baslangic > enGec) continue;

    const aralik = araligaCevir(baslangic, sureDakika);
    if (!araligaUygunMu(saatler, aralik.baslangic, aralik.bitis)) continue;
    if (!uygunMasaSec(masalar, kisiSayisi, aralik, mevcutlar)) continue;

    const s = (n: number) => String(n).padStart(2, "0");
    sonuc.push({
      etiket: `${s(baslangic.getHours())}:${s(baslangic.getMinutes())}`,
      baslangic,
    });
  }

  return sonuc;
}

/**
 * Kullanıcı kendi rezervasyonunu iptal edebilir mi?
 *
 * Başlamış bir rezervasyon iptal EDİLEMİYOR: masa o an tutuluyor ve
 * "iptal" durumu masayı serbest bırakıyor (bkz. masayiMesgulEderMi) —
 * oturan misafirin masasını boş göstermek, üstüne ikinci grup almak
 * demek. Gelmeyen misafiri işaretlemek işletmenin işi ("gelmedi").
 */
export function iptalEdilebilirMi(
  rezervasyon: { durum: string; baslangic: Date },
  simdi: Date = new Date(),
): TalepKarari {
  if (rezervasyon.durum === "iptal") {
    return { izin: false, mesaj: "Bu rezervasyon zaten iptal edilmiş." };
  }
  if (rezervasyon.durum !== "bekliyor" && rezervasyon.durum !== "onaylandi") {
    return { izin: false, mesaj: "Bu rezervasyon uygulamadan iptal edilemiyor." };
  }
  if (rezervasyon.baslangic <= simdi) {
    return {
      izin: false,
      mesaj: "Rezervasyon saati geldi; iptal için mekanı arayın.",
    };
  }
  return { izin: true };
}

/** Kullanıcıya gösterilen durum metni. */
export const TUKETICI_DURUM_METNI: Record<string, string> = {
  bekliyor: "Mekanın onayı bekleniyor",
  onaylandi: "Onaylandı",
  oturdu: "Masanızdasınız",
  tamamlandi: "Tamamlandı",
  iptal: "İptal edildi",
  gelmedi: "Gelinmedi",
};
