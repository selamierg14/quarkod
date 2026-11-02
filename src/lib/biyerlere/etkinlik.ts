import type { RozetAnahtari } from "./rozet";

/**
 * KULLANICI ETKİNLİKLERİNİN KURALLARI — saf, veritabanına dokunmayan taraf.
 *
 * Akış şu: bir kullanıcı "cumartesi 20:00'de Galata Cafe'de buluşuyoruz"
 * diyor, diğerleri "ilgileniyorum" işareti bırakıyor. Katılım taahhüdü,
 * kontenjan ya da bilet YOK — kimsenin altından kalkamayacağı bir söz
 * üretmemek için (gelmeyen kullanıcı, boş kalan masa, kızgın işletmeci).
 *
 * BURASI KULLANICI İÇERİĞİ ve projedeki tek kullanıcı-üretimi yayın
 * yüzeyi. Bir mekanın adının yanında duran, o mekanın yazmadığı bir metin
 * söz konusu; kötüye kullanımın bedelini içeriği yazan değil, adı geçen
 * işletme ödüyor. Bu yüzden dört ayrı kapı var ve hepsi burada, tek
 * dosyada test edilebilir biçimde duruyor:
 *
 *   1. ROZET KAPISI — etkinlik açmak bir hak, kayıt olmakla gelmiyor.
 *   2. SAYI SINIRI — bir kullanıcının aynı anda açık tutabileceği
 *      etkinlik sayısı.
 *   3. ZAMAN PENCERESİ — geçmişe ve çok uzağa etkinlik açılamıyor.
 *   4. METİN SINIRLARI — desenler.ts üzerinden (uzunluk).
 *
 * Kapılar SAF fonksiyonlar olarak ayrıldı çünkü bir tanesinin sessizce
 * gevşemesi doğrudan kötüye kullanıma açılıyor; testin görebileceği
 * yerde durmaları gerekiyor.
 */

/**
 * Etkinlik açmak için gereken rozetlerden EN AZ BİRİ.
 *
 * Neden rozet: kayıt olmak yetseydi, sahte hesapla mekan adına çağrı
 * yapmak bedava olurdu. Buradaki rozetlerin ortak yanı, hepsinin
 * DOĞRULANMIŞ ZİYARET gerektirmesi — yani mekanda fiziksel olarak
 * bulunup karekod okutmuş olmak. Bu, otomatik hesap üretimini pahalı
 * kılan tek eşik.
 *
 * "ilkAdim" bilerek listede DEĞİL: tek ziyaretle kazanılıyor ve eşik
 * olmaktan çıkıyor.
 */
export const ETKINLIK_ACMA_ROZETLERI: readonly RozetAnahtari[] = [
  "kahveGurmesi",
  "ustaKasif",
  "mudavim",
  "geceKusu",
];

/** Bir kullanıcının aynı anda açık tutabileceği etkinlik sayısı. */
export const EN_COK_ACIK_ETKINLIK = 3;

/** Etkinlik en erken bu kadar sonrasına açılabilir. */
export const EN_ERKEN_DAKIKA = 30;

/** Etkinlik en fazla bu kadar ileriye açılabilir. */
export const EN_GEC_GUN = 60;

/**
 * Etkinlik listede ne kadar süre daha görünür.
 *
 * Başlangıç saati geçtiği anda kaybolmuyor: "20:00'de buluşuyoruz"
 * diyen bir etkinlik 20:05'te listeden düşerse, yolda olan kullanıcı
 * detayına bakamaz hâle geliyor.
 */
export const BITIS_PAYI_SAAT = 4;

export type EtkinlikAcmaKarari =
  | { izin: true }
  | { izin: false; sebep: "rozetYok" | "sinirDoldu"; mesaj: string };

/**
 * "Bu kullanıcı etkinlik açabilir mi" sorusu.
 *
 * Mesajlar KULLANICIYA GÖSTERİLİYOR ve ne yapması gerektiğini söylüyor:
 * "yetkiniz yok" demek, kullanıcıyı kapalı bir kapıda bırakıp neden
 * kapalı olduğunu söylememek olurdu.
 */
export function etkinlikAcabilirMi(
  rozetler: readonly string[],
  acikEtkinlikSayisi: number,
): EtkinlikAcmaKarari {
  const rozetVar = rozetler.some((r) =>
    (ETKINLIK_ACMA_ROZETLERI as readonly string[]).includes(r),
  );
  if (!rozetVar) {
    return {
      izin: false,
      sebep: "rozetYok",
      mesaj:
        "Etkinlik açmak için önce birkaç mekanda karekod okutup rozet kazanman gerekiyor.",
    };
  }
  if (acikEtkinlikSayisi >= EN_COK_ACIK_ETKINLIK) {
    return {
      izin: false,
      sebep: "sinirDoldu",
      mesaj: `Aynı anda en fazla ${EN_COK_ACIK_ETKINLIK} etkinliğin açık olabilir. Birini iptal edip yeniden dene.`,
    };
  }
  return { izin: true };
}

export type ZamanKarari = { ok: true; tarih: Date } | { ok: false; hata: string };

/**
 * Başlangıç zamanını çözer ve pencereye sığıp sığmadığına bakar.
 *
 * ALT SINIR neden var: "5 dakika sonra buluşuyoruz" diyen bir etkinliği
 * kimse göremez; liste yenilenene kadar zaten geçmiş olur. Üst sınır ise
 * listeyi bir yıl sonrasının hayali planlarıyla doldurmayı engelliyor.
 */
export function baslangicCoz(ham: unknown, simdi: Date): ZamanKarari {
  if (typeof ham !== "string" || ham.trim() === "") {
    return { ok: false, hata: "Etkinlik saatini seç." };
  }
  const tarih = new Date(ham);
  if (Number.isNaN(tarih.getTime())) {
    return { ok: false, hata: "Etkinlik saati anlaşılamadı." };
  }

  const farkDakika = (tarih.getTime() - simdi.getTime()) / 60_000;
  if (farkDakika < EN_ERKEN_DAKIKA) {
    return {
      ok: false,
      hata: `Etkinlik en az ${EN_ERKEN_DAKIKA} dakika sonrası için açılabilir.`,
    };
  }
  if (farkDakika > EN_GEC_GUN * 24 * 60) {
    return { ok: false, hata: `Etkinlik en fazla ${EN_GEC_GUN} gün sonrası için açılabilir.` };
  }
  return { ok: true, tarih };
}

/**
 * Listede görünmesi gereken etkinliklerin zaman alt sınırı.
 *
 * "Şu an"dan değil, `BITIS_PAYI_SAAT` öncesinden başlıyor — başlamış ama
 * daha bitmemiş etkinlikler listede kalsın.
 */
export function listeAltSiniri(simdi: Date): Date {
  return new Date(simdi.getTime() - BITIS_PAYI_SAAT * 60 * 60 * 1000);
}

/** Etkinlik şu an "başladı" sayılır mı — rozet metni için. */
export function basladiMi(baslangic: Date, simdi: Date): boolean {
  return baslangic.getTime() <= simdi.getTime();
}
