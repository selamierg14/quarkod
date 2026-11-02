import type { Alerjen, OzelBilesen } from "./menu";

/**
 * Şablon ürünleri için tipik menü bilgileri.
 *
 * Menüde bildirilmesi zorunlu dört bilgi (temel bileşenler, enerji,
 * alerjenler, özel bileşenler) 372 şablon ürünü için elle girilemez —
 * girilmesi gerekseydi hiç girilmez, şablon da "boş sayfa korkusunu
 * ortadan kaldırma" işini yapamazdı. Bu tablo şablon uygulandığında
 * makul bir başlangıç dolduruyor.
 *
 * ⚠ Bu değerler TİPİK, işletmenin kendi tarifi DEĞİL. Aynı adı taşıyan
 * iki mutfak farklı çalışır: birinin Adana Kebap'ı lavaşla gelir (gluten),
 * diğerininki pilavla. Bu yüzden şablondan gelen ürünler
 * `bilgilerDogrulandi = false` ile kaydediliyor; panel işletmeyi
 * doğrulamaya çağırıyor, müşteri tarafında da doğrulanmamış olduğu
 * belirtiliyor. Yanlış bir alerjen beyanının sonucu geri alınamaz —
 * "tipik" ile "doğrulanmış" arasındaki farkı gizlemek, hiç bilgi
 * vermemekten tehlikeli olurdu.
 *
 * Eşleme ürün ADINDAN yapılıyor ama tahmine dayanmıyor: şablon adları
 * bizim yazdığımız sabit bir küme, aşağıdaki liste onlarla birebir
 * eşleşiyor. Listede olmayan bir ad için hiçbir şey doldurulmuyor —
 * eksik bilgi, yanlış bilgiden iyidir.
 */
export type UrunTipiBilgisi = {
  icindekiler: string;
  kaloriKcal: number;
  alerjenler: Alerjen[];
  ozelBilesenler?: OzelBilesen[];
};

/**
 * Arketipler. Ürünler tek tek değil bu gruplar üzerinden tanımlanıyor:
 * "bütün sütlü kahvelerde süt var" bilgisi bir kez yazılsın, on üründe
 * ayrı ayrı unutulabilir hâlde durmasın.
 */
const T = {
  // --- İçecekler
  su: { icindekiler: "Doğal kaynak suyu", kaloriKcal: 0, alerjenler: [] },
  gazli: {
    icindekiler: "Su, şeker, karbondioksit, aroma vericiler",
    kaloriKcal: 140,
    alerjenler: [],
  },
  icetea: { icindekiler: "Su, şeker, çay ekstresi, aroma", kaloriKcal: 90, alerjenler: [] },
  cay: { icindekiler: "Siyah çay", kaloriKcal: 0, alerjenler: [] },
  bitkiCayi: { icindekiler: "Bitki karışımı", kaloriKcal: 0, alerjenler: [] },
  sadeKahve: { icindekiler: "Kahve çekirdeği, su", kaloriKcal: 10, alerjenler: [] },
  sutluKahve: {
    icindekiler: "Kahve çekirdeği, süt",
    kaloriKcal: 150,
    alerjenler: ["sut"] as Alerjen[],
  },
  cikolatalIcecek: {
    icindekiler: "Süt, kakao, şeker",
    kaloriKcal: 250,
    alerjenler: ["sut"] as Alerjen[],
  },
  ayran: { icindekiler: "Yoğurt, su, tuz", kaloriKcal: 90, alerjenler: ["sut"] as Alerjen[] },
  meyveSuyu: { icindekiler: "Taze sıkılmış meyve", kaloriKcal: 110, alerjenler: [] },
  limonata: { icindekiler: "Limon, su, şeker", kaloriKcal: 120, alerjenler: [] },
  salgam: { icindekiler: "Şalgam, havuç, bulgur, tuz", kaloriKcal: 30, alerjenler: [] },
  milkshake: {
    icindekiler: "Süt, dondurma, meyve/çikolata",
    kaloriKcal: 400,
    alerjenler: ["sut"] as Alerjen[],
  },
  enerjiIcecegi: { icindekiler: "Su, şeker, kafein, taurin", kaloriKcal: 115, alerjenler: [] },

  // --- Alkollü
  bira: {
    // Arpa maltı: biranın gluten içerdiği en sık atlanan alerjen beyanı.
    icindekiler: "Arpa maltı, şerbetçiotu, su, maya",
    kaloriKcal: 150,
    alerjenler: ["gluten"] as Alerjen[],
    ozelBilesenler: ["alkol"] as OzelBilesen[],
  },
  sarap: {
    icindekiler: "Üzüm, koruyucu (sülfit)",
    kaloriKcal: 125,
    alerjenler: ["sulfit"] as Alerjen[],
    ozelBilesenler: ["alkol"] as OzelBilesen[],
  },
  yuksekIcki: {
    icindekiler: "Damıtılmış alkollü içki",
    kaloriKcal: 100,
    alerjenler: [],
    ozelBilesenler: ["alkol"] as OzelBilesen[],
  },
  kokteyl: {
    icindekiler: "Alkollü içki, meyve suyu/şurup, buz",
    kaloriKcal: 220,
    alerjenler: [],
    ozelBilesenler: ["alkol"] as OzelBilesen[],
  },
  alkolsuzKokteyl: {
    icindekiler: "Meyve suyu, şurup, soda, buz",
    kaloriKcal: 150,
    alerjenler: [],
  },

  // --- Et yemekleri (kebap/ızgara: yanında lavaş-pide ile servis edilir)
  kebap: {
    icindekiler: "Kıyma/kuşbaşı et, baharat, lavaş, garnitür",
    kaloriKcal: 620,
    alerjenler: ["gluten"] as Alerjen[],
  },
  izgaraEt: {
    icindekiler: "Kırmızı et, baharat, garnitür",
    kaloriKcal: 550,
    alerjenler: [],
  },
  izgaraTavuk: { icindekiler: "Tavuk eti, baharat, garnitür", kaloriKcal: 420, alerjenler: [] },
  iskender: {
    icindekiler: "Döner eti, pide, domates sos, tereyağı, yoğurt",
    kaloriKcal: 780,
    alerjenler: ["gluten", "sut"] as Alerjen[],
  },
  guvec: { icindekiler: "Et, sebze, domates sos", kaloriKcal: 480, alerjenler: [] },
  sinitzel: {
    icindekiler: "Tavuk, un, yumurta, galeta unu",
    kaloriKcal: 560,
    alerjenler: ["gluten", "yumurta"] as Alerjen[],
  },

  // --- Ekmek arası / hamur işi
  doner: {
    icindekiler: "Döner eti, ekmek/lavaş, domates, marul",
    kaloriKcal: 600,
    alerjenler: ["gluten"] as Alerjen[],
  },
  durum: {
    icindekiler: "Et/tavuk, lavaş, domates, marul, sos",
    kaloriKcal: 620,
    alerjenler: ["gluten"] as Alerjen[],
  },
  pide: {
    icindekiler: "Buğday unu hamuru, iç harç",
    kaloriKcal: 650,
    alerjenler: ["gluten"] as Alerjen[],
  },
  pideKasarli: {
    icindekiler: "Buğday unu hamuru, kaşar peyniri, iç harç",
    kaloriKcal: 700,
    alerjenler: ["gluten", "sut"] as Alerjen[],
  },
  lahmacun: {
    icindekiler: "İnce hamur, kıyma, domates, biber, maydanoz",
    kaloriKcal: 330,
    alerjenler: ["gluten"] as Alerjen[],
  },
  pizza: {
    icindekiler: "Buğday unu hamuru, domates sos, mozzarella",
    kaloriKcal: 780,
    alerjenler: ["gluten", "sut"] as Alerjen[],
  },
  burger: {
    icindekiler: "Susamlı ekmek, köfte, marul, domates, sos",
    kaloriKcal: 700,
    alerjenler: ["gluten", "sut", "yumurta", "susam"] as Alerjen[],
  },
  sandvic: {
    icindekiler: "Ekmek, iç malzeme, sos",
    kaloriKcal: 480,
    alerjenler: ["gluten", "sut"] as Alerjen[],
  },
  tost: {
    icindekiler: "Ekmek, kaşar peyniri, iç malzeme",
    kaloriKcal: 450,
    alerjenler: ["gluten", "sut"] as Alerjen[],
  },
  sucukEkmek: {
    icindekiler: "Ekmek, sucuk",
    kaloriKcal: 520,
    alerjenler: ["gluten"] as Alerjen[],
  },
  borek: {
    icindekiler: "Yufka, iç harç, yumurta",
    kaloriKcal: 380,
    alerjenler: ["gluten", "sut", "yumurta"] as Alerjen[],
  },
  hamurIsi: {
    icindekiler: "Buğday unu, maya, yağ",
    kaloriKcal: 300,
    alerjenler: ["gluten"] as Alerjen[],
  },
  sarimsakliEkmek: {
    icindekiler: "Ekmek, tereyağı, sarımsak",
    kaloriKcal: 340,
    alerjenler: ["gluten", "sut"] as Alerjen[],
  },

  // --- Makarna
  makarna: {
    icindekiler: "Buğday makarnası, sos",
    kaloriKcal: 620,
    alerjenler: ["gluten"] as Alerjen[],
  },
  makarnaKremali: {
    icindekiler: "Buğday makarnası, krema, peynir",
    kaloriKcal: 720,
    alerjenler: ["gluten", "sut"] as Alerjen[],
  },
  lazanya: {
    icindekiler: "Makarna, kıyma, beşamel sos, peynir",
    kaloriKcal: 750,
    alerjenler: ["gluten", "sut", "yumurta"] as Alerjen[],
  },

  // --- Çorba
  mercimekCorba: {
    icindekiler: "Kırmızı mercimek, soğan, tereyağı",
    kaloriKcal: 210,
    alerjenler: ["sut"] as Alerjen[],
  },
  yaylaCorba: {
    icindekiler: "Yoğurt, pirinç, un, nane",
    kaloriKcal: 230,
    alerjenler: ["sut", "gluten"] as Alerjen[],
  },
  iskembeCorba: {
    icindekiler: "İşkembe, un, süt, sarımsak",
    kaloriKcal: 280,
    alerjenler: ["sut", "gluten"] as Alerjen[],
  },
  domatesCorba: {
    icindekiler: "Domates, un, tereyağı, krema",
    kaloriKcal: 240,
    alerjenler: ["sut", "gluten"] as Alerjen[],
  },

  // --- Deniz ürünleri
  balik: { icindekiler: "Balık, zeytinyağı, baharat", kaloriKcal: 400, alerjenler: ["balik"] as Alerjen[] },
  balikTava: {
    icindekiler: "Balık, mısır unu, ayçiçek yağı",
    kaloriKcal: 480,
    alerjenler: ["balik"] as Alerjen[],
  },
  karides: {
    icindekiler: "Karides, tereyağı, sarımsak",
    kaloriKcal: 320,
    alerjenler: ["kabuklu", "sut"] as Alerjen[],
  },
  midyeKalamar: {
    icindekiler: "Deniz ürünü, un, ayçiçek yağı",
    kaloriKcal: 420,
    alerjenler: ["yumusakca", "gluten"] as Alerjen[],
  },
  ahtapot: { icindekiler: "Ahtapot, zeytinyağı, limon", kaloriKcal: 260, alerjenler: ["yumusakca"] as Alerjen[] },
  denizSalata: {
    icindekiler: "Deniz ürünleri, zeytinyağı, limon",
    kaloriKcal: 300,
    alerjenler: ["kabuklu", "yumusakca", "balik"] as Alerjen[],
  },
  cerezBalik: {
    icindekiler: "Kurutulmuş/salamura balık, zeytinyağı",
    kaloriKcal: 250,
    alerjenler: ["balik"] as Alerjen[],
  },

  // --- Salata & meze
  salata: {
    icindekiler: "Mevsim sebzeleri, zeytinyağı, limon",
    kaloriKcal: 180,
    alerjenler: [],
  },
  salataPeynirli: {
    icindekiler: "Mevsim sebzeleri, peynir, zeytinyağı",
    kaloriKcal: 260,
    alerjenler: ["sut"] as Alerjen[],
  },
  sezarSalata: {
    icindekiler: "Marul, tavuk, kruton, parmesan, sezar sos",
    kaloriKcal: 420,
    alerjenler: ["gluten", "sut", "yumurta", "balik"] as Alerjen[],
  },
  rusSalatasi: {
    icindekiler: "Patates, havuç, bezelye, mayonez",
    kaloriKcal: 320,
    alerjenler: ["yumurta"] as Alerjen[],
  },
  coleslaw: {
    icindekiler: "Beyaz lahana, havuç, mayonez",
    kaloriKcal: 220,
    alerjenler: ["yumurta"] as Alerjen[],
  },
  yogurtluMeze: {
    icindekiler: "Yoğurt, sarımsak, otlar",
    kaloriKcal: 200,
    alerjenler: ["sut"] as Alerjen[],
  },
  susamliMeze: {
    icindekiler: "Nohut/susam ezmesi (tahin), limon, zeytinyağı",
    kaloriKcal: 280,
    alerjenler: ["susam"] as Alerjen[],
  },
  sebzeMeze: { icindekiler: "Sebze, zeytinyağı, baharat", kaloriKcal: 190, alerjenler: [] },
  peynirTabagi: {
    icindekiler: "Çeşitli peynirler",
    kaloriKcal: 380,
    alerjenler: ["sut"] as Alerjen[],
  },
  kuruyemis: {
    icindekiler: "Karışık kuruyemiş",
    kaloriKcal: 450,
    alerjenler: ["sertkabuklu", "yerfistigi"] as Alerjen[],
  },
  tursu: { icindekiler: "Salamura sebze, sirke, tuz", kaloriKcal: 30, alerjenler: [] },

  // --- Kahvaltı
  kahvaltiTabagi: {
    icindekiler: "Peynir, zeytin, domates, salatalık, yumurta, ekmek",
    kaloriKcal: 650,
    alerjenler: ["sut", "yumurta", "gluten"] as Alerjen[],
  },
  yumurtaYemegi: {
    icindekiler: "Yumurta, tereyağı, iç malzeme",
    kaloriKcal: 380,
    alerjenler: ["yumurta", "sut"] as Alerjen[],
  },
  balKaymak: {
    icindekiler: "Kaymak, bal, ekmek",
    kaloriKcal: 480,
    alerjenler: ["sut", "gluten"] as Alerjen[],
  },

  // --- Yan ürünler
  patates: { icindekiler: "Patates, ayçiçek yağı, tuz", kaloriKcal: 340, alerjenler: [] },
  patatesPeynirli: {
    icindekiler: "Patates, cheddar peyniri",
    kaloriKcal: 480,
    alerjenler: ["sut"] as Alerjen[],
  },
  kizartma: {
    icindekiler: "Un, galeta unu, ayçiçek yağı",
    kaloriKcal: 420,
    alerjenler: ["gluten", "yumurta"] as Alerjen[],
  },
  kizartmaPeynirli: {
    icindekiler: "Peynir, galeta unu, ayçiçek yağı",
    kaloriKcal: 460,
    alerjenler: ["gluten", "sut", "yumurta"] as Alerjen[],
  },
  tavukKizartma: {
    icindekiler: "Tavuk, un, galeta unu, baharat",
    kaloriKcal: 520,
    alerjenler: ["gluten", "yumurta"] as Alerjen[],
  },
  kanat: { icindekiler: "Tavuk kanat, baharat, sos", kaloriKcal: 480, alerjenler: [] },
  nachos: {
    icindekiler: "Mısır cipsi, cheddar sos, jalapeño",
    kaloriKcal: 520,
    alerjenler: ["sut"] as Alerjen[],
  },
  pilav: { icindekiler: "Pirinç, tereyağı, tuz", kaloriKcal: 280, alerjenler: ["sut"] as Alerjen[] },
  bulgurPilavi: {
    icindekiler: "Bulgur, salça, soğan",
    kaloriKcal: 260,
    alerjenler: ["gluten"] as Alerjen[],
  },

  // --- Tatlılar
  serbetliTatli: {
    icindekiler: "Yufka/irmik, şeker şerbeti, tereyağı, ceviz/fıstık",
    kaloriKcal: 480,
    alerjenler: ["gluten", "sut", "sertkabuklu"] as Alerjen[],
  },
  kunefe: {
    icindekiler: "Kadayıf, peynir, şerbet, tereyağı",
    kaloriKcal: 550,
    alerjenler: ["gluten", "sut"] as Alerjen[],
  },
  sutluTatli: {
    icindekiler: "Süt, şeker, nişasta",
    kaloriKcal: 300,
    alerjenler: ["sut"] as Alerjen[],
  },
  sutluTatliUnlu: {
    icindekiler: "Süt, un, şeker, yumurta",
    kaloriKcal: 380,
    alerjenler: ["sut", "gluten", "yumurta"] as Alerjen[],
  },
  pasta: {
    icindekiler: "Un, şeker, yumurta, süt, krema",
    kaloriKcal: 420,
    alerjenler: ["gluten", "sut", "yumurta"] as Alerjen[],
  },
  cikolataliTatli: {
    icindekiler: "Çikolata, un, tereyağı, yumurta",
    kaloriKcal: 450,
    alerjenler: ["gluten", "sut", "yumurta"] as Alerjen[],
  },
  kurabiye: {
    icindekiler: "Un, tereyağı, şeker, yumurta",
    kaloriKcal: 380,
    alerjenler: ["gluten", "sut", "yumurta"] as Alerjen[],
  },
  dondurma: { icindekiler: "Süt, şeker, aroma", kaloriKcal: 200, alerjenler: ["sut"] as Alerjen[] },
  meyveTabagi: { icindekiler: "Mevsim meyveleri", kaloriKcal: 150, alerjenler: [] },
  irmikHelvasi: {
    icindekiler: "İrmik, tereyağı, şeker, çam fıstığı",
    kaloriKcal: 420,
    alerjenler: ["gluten", "sut", "sertkabuklu"] as Alerjen[],
  },
} satisfies Record<string, UrunTipiBilgisi>;

type Arketip = keyof typeof T;

/**
 * Şablon ürün adı → arketip.
 *
 * Birebir eşleşme; bulanık arama YOK. "Tavuk Şiş" ile "Tavuk Şinitzel"i
 * ayıran şey burada açıkça yazılmış olması.
 */
const ESLEME: Record<string, Arketip> = {
  // İçecekler
  "Su (0.5 lt)": "su",
  Kola: "gazli",
  Fanta: "gazli",
  Sprite: "gazli",
  Soda: "gazli",
  "Meyveli Soda": "gazli",
  "Ice Tea Limon": "icetea",
  "Ice Tea Şeftali": "icetea",
  "Ice Tea Mango": "icetea",
  Çay: "cay",
  "Bitki Çayı": "bitkiCayi",
  Espresso: "sadeKahve",
  Americano: "sadeKahve",
  "Filtre Kahve": "sadeKahve",
  "Cold Brew": "sadeKahve",
  "Ice Americano": "sadeKahve",
  "Türk Kahvesi": "sadeKahve",
  "Double Türk Kahvesi": "sadeKahve",
  Latte: "sutluKahve",
  Cappuccino: "sutluKahve",
  "Flat White": "sutluKahve",
  Mocha: "sutluKahve",
  "Ice Latte": "sutluKahve",
  "Ice Mocha": "sutluKahve",
  Frappe: "sutluKahve",
  "Sıcak Çikolata": "cikolatalIcecek",
  Salep: "cikolatalIcecek",
  Ayran: "ayran",
  "Milkshake (Çilek/Muz/Çikolata)": "milkshake",
  "Taze Sıkılmış Portakal Suyu": "meyveSuyu",
  Limonata: "limonata",
  "Şalgam Suyu": "salgam",
  "Enerji İçeceği": "enerjiIcecegi",

  // Alkollü
  Bira: "bira",
  "Şişe Bira": "bira",
  "İthal Bira": "bira",
  "Fıçı Bira (33 cl)": "bira",
  "Fıçı Bira (50 cl)": "bira",
  "Kırmızı Şarap (Kadeh)": "sarap",
  "Beyaz Şarap (Kadeh)": "sarap",
  "Rose (Kadeh)": "sarap",
  "Şarap (Şişe)": "sarap",
  "Rakı (Tek)": "yuksekIcki",
  "Rakı (Duble)": "yuksekIcki",
  "Viski (Tek)": "yuksekIcki",
  "Viski (Duble)": "yuksekIcki",
  "Votka (Tek)": "yuksekIcki",
  "Votka (Duble)": "yuksekIcki",
  "Cin (Tek)": "yuksekIcki",
  "Rom (Tek)": "yuksekIcki",
  "Tekila (Tek)": "yuksekIcki",
  "Tekila Shot": "yuksekIcki",
  Jägermeister: "yuksekIcki",
  Sambuca: "yuksekIcki",
  "B-52": "kokteyl",
  Mojito: "kokteyl",
  "Gin Tonic": "kokteyl",
  Cosmopolitan: "kokteyl",
  "Sex on the Beach": "kokteyl",
  "Long Island Ice Tea": "kokteyl",
  "Piña Colada": "kokteyl",
  "Tequila Sunrise": "kokteyl",
  Margarita: "kokteyl",
  Negroni: "kokteyl",
  "Old Fashioned": "kokteyl",
  "Whiskey Sour": "kokteyl",
  "Aperol Spritz": "kokteyl",
  "Virgin Mojito": "alkolsuzKokteyl",

  // Kebap & et
  "Adana Kebap": "kebap",
  "Urfa Kebap": "kebap",
  "Beyti Kebap": "kebap",
  "Patlıcan Kebap": "kebap",
  "Ali Nazik": "kebap",
  "Karışık Izgara": "kebap",
  "Izgara Köfte": "izgaraEt",
  "Kuzu Şiş": "izgaraEt",
  "Kuzu Pirzola": "izgaraEt",
  "Tavuk Şiş": "izgaraTavuk",
  "Izgara Tavuk": "izgaraTavuk",
  İskender: "iskender",
  "Etli Güveç": "guvec",
  Karnıyarık: "guvec",
  "Tavuk Şinitzel": "sinitzel",

  // Ekmek arası
  "Et Döner Dürüm": "durum",
  "Tavuk Döner Dürüm": "durum",
  "Adana Dürüm": "durum",
  "Tavuk Dürüm": "durum",
  "Lahmacun Dürüm": "durum",
  "Et Döner Ekmek Arası": "doner",
  "Tavuk Döner Ekmek Arası": "doner",
  "Porsiyon Et Döner": "doner",
  "Porsiyon Tavuk Döner": "doner",
  "Kıymalı Pide": "pide",
  "Kuşbaşılı Pide": "pide",
  "Kaşarlı Pide": "pideKasarli",
  "Kuşbaşılı Kaşarlı Pide": "pideKasarli",
  Lahmacun: "lahmacun",
  Margherita: "pizza",
  Pepperoni: "pizza",
  "Karışık Pizza": "pizza",
  "Sucuklu Pizza": "pizza",
  "Tavuklu Pizza": "pizza",
  "Vejetaryen Pizza": "pizza",
  "BBQ Chicken": "pizza",
  "Quattro Formaggi": "pizza",
  "Klasik Burger": "burger",
  Cheeseburger: "burger",
  "Double Cheeseburger": "burger",
  "Acılı Burger": "burger",
  "BBQ Burger": "burger",
  "Mantarlı Burger": "burger",
  "Tavuk Burger": "burger",
  "Vejetaryen Burger": "burger",
  Sandviç: "sandvic",
  "Club Sandviç": "sandvic",
  Kumru: "sandvic",
  "Ayvalık Tostu": "tost",
  "Kaşarlı Tost": "tost",
  "Karışık Tost": "tost",
  "Sucuk Ekmek": "sucukEkmek",
  "Sigara Böreği": "borek",
  "Su Böreği (Dilim)": "borek",
  "Paçanga Böreği": "borek",
  Poğaça: "hamurIsi",
  Açma: "hamurIsi",
  Simit: "hamurIsi",
  "Sarımsaklı Ekmek": "sarimsakliEkmek",
  Bruschetta: "sarimsakliEkmek",

  // Makarna
  "Spaghetti Bolognese": "makarna",
  "Napoliten Makarna": "makarna",
  "Penne Arabiata": "makarna",
  "Pesto Makarna": "makarna",
  "Alfredo Makarna": "makarnaKremali",
  "Fettuccine Alfredo": "makarnaKremali",
  Lazanya: "lazanya",

  // Çorba
  "Mercimek Çorbası": "mercimekCorba",
  "Ezogelin Çorbası": "mercimekCorba",
  "Yayla Çorbası": "yaylaCorba",
  "İşkembe Çorbası": "iskembeCorba",
  "Domates Çorbası": "domatesCorba",

  // Deniz
  "Levrek (Izgara)": "balik",
  "Çupra (Izgara)": "balik",
  "Somon (Izgara)": "balik",
  "Lüfer (Izgara)": "balik",
  "Palamut (Izgara)": "balik",
  "Hamsi Tava": "balikTava",
  "Barbun Tava": "balikTava",
  "Mezgit Tava": "balikTava",
  "Karides Tava": "karides",
  "Karides Güveç": "karides",
  "Midye Tava": "midyeKalamar",
  "Kalamar Tava": "midyeKalamar",
  "Ahtapot Izgara": "ahtapot",
  "Deniz Mahsulleri Salatası": "denizSalata",
  Lakerda: "cerezBalik",
  Çiroz: "cerezBalik",
  "Deniz Börülcesi": "sebzeMeze",

  // Salata & meze
  "Çoban Salata": "salata",
  "Mevsim Salata": "salata",
  "Roka Salata": "salata",
  "Akdeniz Salata": "salataPeynirli",
  "Gavurdağı Salata": "salata",
  Semizotu: "yogurtluMeze",
  "Sezar Salata": "sezarSalata",
  "Rus Salatası": "rusSalatasi",
  Coleslaw: "coleslaw",
  Haydari: "yogurtluMeze",
  Atom: "yogurtluMeze",
  Humus: "susamliMeze",
  "Acılı Ezme": "sebzeMeze",
  Şakşuka: "sebzeMeze",
  Fava: "sebzeMeze",
  "Peynir Tabağı": "peynirTabagi",
  "Karışık Kuruyemiş": "kuruyemis",
  Turşu: "tursu",

  // Kahvaltı
  "Serpme Kahvaltı (Kişi Başı)": "kahvaltiTabagi",
  "Serpme Kahvaltı (2 Kişilik)": "kahvaltiTabagi",
  "Kahvaltı Tabağı": "kahvaltiTabagi",
  Menemen: "yumurtaYemegi",
  Omlet: "yumurtaYemegi",
  "Sahanda Yumurta": "yumurtaYemegi",
  "Sucuklu Yumurta": "yumurtaYemegi",
  Kaygana: "yumurtaYemegi",
  "Bal Kaymak": "balKaymak",
  Katmer: "serbetliTatli",

  // Yan ürünler
  "Patates Kızartması": "patates",
  "Cheddarlı Patates": "patatesPeynirli",
  "Soğan Halkası": "kizartma",
  "Mozzarella Stick": "kizartmaPeynirli",
  "Tavuk Nugget (9'lu)": "tavukKizartma",
  "Chicken Tenders (6'lı)": "tavukKizartma",
  "Kanat (8'li)": "kanat",
  Nachos: "nachos",
  Pilav: "pilav",
  "Pirinç Pilavı": "pilav",
  "Bulgur Pilavı": "bulgurPilavi",

  // Tatlılar
  "Baklava (Porsiyon)": "serbetliTatli",
  Şöbiyet: "serbetliTatli",
  Kadayıf: "serbetliTatli",
  Tulumba: "serbetliTatli",
  Revani: "serbetliTatli",
  Künefe: "kunefe",
  Sütlaç: "sutluTatli",
  Muhallebi: "sutluTatli",
  Kazandibi: "sutluTatli",
  Supangle: "sutluTatli",
  Magnolia: "sutluTatli",
  Trileçe: "sutluTatliUnlu",
  Profiterol: "sutluTatliUnlu",
  Tiramisu: "pasta",
  Cheesecake: "pasta",
  "San Sebastian": "pasta",
  "Çikolatalı Pasta (Dilim)": "pasta",
  "Meyveli Pasta (Dilim)": "pasta",
  Brownie: "cikolataliTatli",
  "Çikolatalı Sufle": "cikolataliTatli",
  Cookie: "kurabiye",
  "Kurabiye (100 gr)": "kurabiye",
  "Dondurma (Top)": "dondurma",
  "Mevsim Meyveleri": "meyveTabagi",
  "İrmik Helvası": "irmikHelvasi",
};

/**
 * Bir şablon ürününün tipik bilgileri; tanımlı değilse null.
 *
 * null dönmesi bir hata değil: eksik bilgi, uydurulmuş bilgiden iyidir.
 * O ürün panelde "eksik" olarak görünür ve işletme kendisi doldurur.
 */
export function sablonUrunBilgisi(ad: string): UrunTipiBilgisi | null {
  const arketip = ESLEME[ad];
  return arketip ? T[arketip] : null;
}

/** Testler için: eşlemesi olan ürün adları. */
export function eslenenUrunAdlari(): string[] {
  return Object.keys(ESLEME);
}
