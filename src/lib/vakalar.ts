/**
 * Vaka çalışmaları.
 *
 * ÖNEMLİ: Buradaki kayıtlar şu an **temsilî senaryolar** — gerçek bir
 * müşterinin adı, sayısı ya da sözü değil. Uydurma referans yayımlamak hem
 * yanıltıcı hem de bir gün gerçek müşteri geldiğinde geri alınması zor bir
 * iddia bırakır. Bu yüzden her kaydın `temsili` alanı var ve sayfada
 * görünür bir rozetle işaretleniyor.
 *
 * Gerçek vaka eklerken: `temsili: false` yapın, işletmeden yazılı izin
 * alın ve rakamları panelden doğrulanabilir hâle getirin.
 */
export type Vaka = {
  slug: string;
  isletme: string;
  tur: string;
  ozet: string;
  /** Gerçek müşteri değilse true — sayfada "temsilî senaryo" rozeti çıkar. */
  temsili: boolean;
  sorun: string;
  cozum: string[];
  sonuc: { etiket: string; deger: string; not: string }[];
  alinti?: { soz: string; kisi: string };
};

export const VAKALAR: Vaka[] = [
  {
    slug: "kafe-servis-hizi",
    isletme: "Şehir merkezinde bir kafe",
    tur: "Kafe · tek şube · 14 masa",
    ozet:
      "Google puanı düşerken sebebini kimse bilmiyordu. Masa ve vardiya kırılımı, sorunun tek bir zaman diliminde toplandığını gösterdi.",
    temsili: true,
    sorun:
      "Google puanı 4.6'dan 4.1'e inmişti. Yorumlarda \"servis yavaş\" deniyordu ama işletme sahibi hangi saatte, hangi masada olduğunu bilmiyordu; personelin tamamına \"daha hızlı olun\" demekten başka elinde bir şey yoktu.",
    cozum: [
      "Her masaya kendi QR kartı konuldu; geri bildirimler masa ve saatle etiketlendi.",
      "Vardiya saatleri işletmenin gerçek düzenine göre ayarlandı (sabah 07:00, akşam 15:00).",
      "Bildirim eşiği 3 yıldıza çekildi — düşük puan geldiği anda e-posta gidiyor.",
    ],
    sonuc: [
      {
        etiket: "Sorunun kaynağı",
        deger: "Akşam vardiyası",
        not: "Servis hızı puanı akşam 2.8, sabah 4.4 çıktı.",
      },
      {
        etiket: "İkinci bulgu",
        deger: "Bahçe masaları",
        not: "Mutfağa en uzak 4 masa ortalamayı aşağı çekiyordu.",
      },
      {
        etiket: "Alınan aksiyon",
        deger: "Tek kişi eklendi",
        not: "Akşam vardiyasına bir servis elemanı, bahçeye ayrı sorumlu.",
      },
    ],
  },
  {
    slug: "restoran-urun-puanlari",
    isletme: "Aile restoranı",
    tur: "Restoran · tek şube · 26 masa",
    ozet:
      "Menüdeki hangi yemeğin sorun çıkardığı yıllardır tartışılıyordu. Ürün bazlı puanlama tartışmayı iki haftada bitirdi.",
    temsili: true,
    sorun:
      "\"Yemek kalitesi\" puanı ortalamanın altındaydı ama bu tek başına bir şey söylemiyordu: 40 ürünlük menüde sorunun hangisinde olduğu belirsizdi. Mutfak ve salon birbirini suçluyordu.",
    cozum: [
      "QR menü açıldı, müşteri ne yediğini seçip tek tek puanlayabildi.",
      "Ürün puanları raporunda güvenilir oy sınırının üstündekiler izlendi.",
      "Düşük puanlı iki ürün için tarif ve porsiyon gözden geçirildi.",
    ],
    sonuc: [
      {
        etiket: "Tespit",
        deger: "2 ürün",
        not: "40 ürünün 2'si genel ortalamayı tek başına aşağı çekiyordu.",
      },
      {
        etiket: "Yanlış suçlama",
        deger: "Sona erdi",
        not: "Sorun serviste değil, iki tarifin porsiyon ve sıcaklığındaydı.",
      },
      {
        etiket: "Menü kararı",
        deger: "1 ürün kaldırıldı",
        not: "Diğeri revize edildi; puanı üç hafta içinde toparlandı.",
      },
    ],
  },
  {
    slug: "zincir-sube-karsilastirma",
    isletme: "Üç şubeli zincir",
    tur: "Yeme-içme · 3 şube",
    ozet:
      "Şubeler arasındaki fark ancak müşteri şikayeti büyüyünce fark ediliyordu. Tek panelde karşılaştırma bunu haftalık rutine çevirdi.",
    temsili: true,
    sorun:
      "Her şube kendi içinde \"iyi gidiyoruz\" diyordu; merkez ise şubeleri ancak Google yorumları üzerinden, geç ve eksik görüyordu. Karşılaştırılabilir tek bir sayı yoktu.",
    cozum: [
      "Üç şube tek hesaba bağlandı, her birine bölge müdürü rolü tanımlandı.",
      "Şube karşılaştırma ekranı haftalık toplantının ilk maddesi yapıldı.",
      "Haftalık özet e-postası şube sorumlularına da açıldı.",
    ],
    sonuc: [
      {
        etiket: "Görünürlük",
        deger: "Haftalık",
        not: "Şube farkı artık şikayet büyümeden, sayıyla görülüyor.",
      },
      {
        etiket: "Odak",
        deger: "En düşük şube",
        not: "Merkez, kaynağı en çok ihtiyacı olan şubeye ayırabiliyor.",
      },
      {
        etiket: "Yayılma",
        deger: "İyi uygulama",
        not: "En yüksek puanlı şubenin yöntemi diğerlerine aktarıldı.",
      },
    ],
  },
];

export function vakaBul(slug: string): Vaka | undefined {
  return VAKALAR.find((v) => v.slug === slug);
}
