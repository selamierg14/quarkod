/**
 * BİLDİRİM TERCİHLERİ — hangi bildirimi almak istiyor.
 *
 * Tek bir aç/kapa anahtarı vardı ve bu, elindeki en değerli kanalı
 * korumasız bırakıyordu: konuyla ilgisiz iki bildirim alan kullanıcı
 * anahtarı tamamen kapatıyor, sonrasında rozet, rezervasyon ve favori
 * mekan duyurusu dahil HİÇBİR şey ulaşamıyor. Üstelik işletmeye
 * satılacak olan (push kredisi) tam da o kapatılan kanal.
 *
 * Kategoriler kullanıcının tanıdığı işlere göre ayrıldı, bildirimi
 * ÜRETEN teknik kaynağa göre değil: kimse "AppBadge kaydı" istemez,
 * "rozet kazandığımda haber ver" ister.
 *
 * REZERVASYON DURUMU LİSTEDE YOK ve bu bilinçli: kullanıcının kendi
 * başlattığı bir işlemin sonucu (onaylandı / iptal edildi) pazarlama
 * değil, işlemin parçası. Kapatılabilir olsaydı kişi mekana onaysız
 * gider ve kapıda kalırdı. Aynı sebeple hesap güvenliği bildirimleri de
 * kapatılamıyor.
 */

export const BILDIRIM_TERCIHLERI = {
  firsat: {
    ad: "Yakınımdaki fırsatlar",
    aciklama: "Bulunduğun bölgedeki mekanların anlık kampanyaları.",
  },
  favoriDuyuru: {
    ad: "Favori mekanlarım",
    aciklama: "Favorilediğin mekanların yeni duyuruları ve etkinlikleri.",
  },
  rozet: {
    ad: "Rozet ve puan",
    aciklama: "Yeni rozet kazandığında ve seviye atladığında.",
  },
} as const;

export type TercihAnahtari = keyof typeof BILDIRIM_TERCIHLERI;

export const TERCIH_ANAHTARLARI = Object.keys(BILDIRIM_TERCIHLERI) as TercihAnahtari[];

/**
 * `deger in BILDIRIM_TERCIHLERI` DEĞİL: `in` prototip zincirine de bakıyor
 * ve "__proto__", "constructor", "toString" gibi adlar için `true`
 * dönüyordu. Tercih adları istekle gelen ham metinler olduğu için liste
 * üzerinden kontrol tek güvenli yol.
 */
export function gecerliTercihMi(deger: string): deger is TercihAnahtari {
  return (TERCIH_ANAHTARLARI as string[]).includes(deger);
}

export type Tercihler = Record<TercihAnahtari, boolean>;

/**
 * Varsayılan: hepsi AÇIK.
 *
 * Kapalı başlatmak "hiç bildirim gitmiyor" demek olurdu — kullanıcı
 * kapatmadığı bir şeyi açmayı da düşünmez. Açık başlayıp kolay
 * kapatılabilir olması, kanalı hem canlı hem saygılı tutuyor.
 */
export function varsayilanTercihler(): Tercihler {
  return Object.fromEntries(TERCIH_ANAHTARLARI.map((a) => [a, true])) as Tercihler;
}

/**
 * Gövdeden gelen ham nesneyi MEVCUT tercihlerin üstüne uygular.
 *
 * Kısmi gönderim destekleniyor: arayüz tek bir anahtarı değiştirdiğinde
 * diğerlerini de göndermek zorunda kalmıyor. Tanınmayan anahtar ve
 * boolean olmayan değer sessizce atlanıyor — biri elle `{"firsat":
 * "evet"}` gönderdiğinde bu, "true" sayılıp kullanıcının kapattığı
 * kanalı geri açmamalı.
 */
export function tercihleriBirlestir(mevcut: Tercihler, ham: unknown): Tercihler {
  if (typeof ham !== "object" || ham === null || Array.isArray(ham)) return mevcut;

  const sonuc = { ...mevcut };
  for (const [anahtar, deger] of Object.entries(ham as Record<string, unknown>)) {
    if (gecerliTercihMi(anahtar) && typeof deger === "boolean") {
      sonuc[anahtar] = deger;
    }
  }
  return sonuc;
}

/** Arayüzün listeyi çizebilmesi için: anahtar + metin + durum. */
export function tercihListesi(tercihler: Tercihler) {
  return TERCIH_ANAHTARLARI.map((anahtar) => ({
    anahtar,
    ...BILDIRIM_TERCIHLERI[anahtar],
    acik: tercihler[anahtar],
  }));
}
