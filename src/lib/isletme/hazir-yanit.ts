/**
 * MÜŞTERİYE HAZIR YANITLAR.
 *
 * Şikayet döngüsünü kapatan yanıt kutusu aylardır duruyor ama boş bir
 * metin alanı olarak: telefonun başında, servis sırasında, kızgın bir
 * yoruma sıfırdan cümle kurmak zor ve o yüzden çoğu yanıt hiç
 * yazılmıyor. Değerli olan pencere ise dar — müşteri hâlâ masadayken ya
 * da o günün akşamında.
 *
 * Şablonlar METNİ HAZIR GETİRİYOR, göndermiyor: personel dokununca metin
 * kutuya düşüyor ve düzenlenebiliyor. Tek dokunuşla gönderilen bir yanıt,
 * yanlış şikayete yanlış cümle göndermenin en kolay yolu olurdu.
 *
 * PUANA GÖRE DEĞİŞİYOR. Bir yıldıza "geri bildiriminiz için teşekkürler"
 * yazmak, beş yıldıza özür dilemek kadar yanlış: ikisi de okuyan kişide
 * "beni dinlememişler" hissi bırakır.
 *
 * Saf: veritabanına ve Next'e dokunmuyor, hem sunucu hem arayüz aynı
 * listeyi kullanıyor.
 */

export type HazirYanit = {
  /** Düğmede yazan kısa etiket. */
  etiket: string;
  /** Kutuya düşen metin. */
  metin: string;
};

/** SMS ile gidebildiği için metinler kısa tutuluyor (uç sınırı 480). */
export const EN_UZUN_YANIT = 480;

/**
 * Yanıt şablonları.
 *
 * `{isletme}` yer tutucusu işletme adıyla dolduruluyor. Doldurulmamış bir
 * yer tutucunun müşteriye gitmesi, hazır yanıt kullanıldığını en açık
 * şekilde ilan etmek olurdu.
 */
const DUSUK_PUAN: HazirYanit[] = [
  {
    etiket: "Özür + telafi",
    metin:
      "Merhaba, {isletme} olarak yaşadığınız olumsuzluk için çok üzgünüz. " +
      "Bir sonraki ziyaretinizde ikramımız olsun; lütfen gelmeden önce bize haber verin.",
  },
  {
    etiket: "Sorunu çözdük",
    metin:
      "Merhaba, bildirdiğiniz konuyu ekibimizle paylaştık ve gerekli düzenlemeyi yaptık. " +
      "Bizi uyardığınız için teşekkür ederiz — {isletme} ekibi.",
  },
  {
    etiket: "Sizi arayalım",
    metin:
      "Merhaba, yaşadıklarınızı daha iyi anlamak istiyoruz. Uygun olduğunuz bir saatte " +
      "sizi arayabilir miyiz? {isletme}",
  },
];

const ORTA_PUAN: HazirYanit[] = [
  {
    etiket: "Teşekkür + söz",
    metin:
      "Merhaba, geri bildiriminiz için teşekkür ederiz. Eksik bulduğunuz noktaları " +
      "not aldık ve üzerinde çalışıyoruz. Yeniden bekleriz — {isletme}",
  },
  {
    etiket: "Ne eksikti?",
    metin:
      "Merhaba, puanınız için teşekkürler. Beş yıldız için neyi daha iyi yapabileceğimizi " +
      "yazarsanız çok memnun oluruz. {isletme}",
  },
];

const YUKSEK_PUAN: HazirYanit[] = [
  {
    etiket: "Teşekkür",
    metin:
      "Merhaba, güzel yorumunuz için teşekkür ederiz! Sizi yeniden ağırlamak için " +
      "sabırsızlanıyoruz — {isletme} ekibi.",
  },
];

/** Puan eşikleri: 1-2 düşük, 3 orta, 4-5 yüksek. */
export function hazirYanitlar(puan: number, isletmeAdi: string): HazirYanit[] {
  const liste = puan <= 2 ? DUSUK_PUAN : puan === 3 ? ORTA_PUAN : YUKSEK_PUAN;
  return liste.map((y) => ({
    etiket: y.etiket,
    metin: yerTutucuDoldur(y.metin, isletmeAdi).slice(0, EN_UZUN_YANIT),
  }));
}

export function yerTutucuDoldur(metin: string, isletmeAdi: string): string {
  return metin.replaceAll("{isletme}", isletmeAdi.trim());
}
