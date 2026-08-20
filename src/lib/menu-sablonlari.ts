import type { BusinessType } from "./constants";

/**
 * Hazır menü şablonları.
 *
 * Satış ziyaretinde boş bir menüyle "siz doldurun" demek zayıf bir gösterim;
 * bir şablon seçip saniyeler içinde dolu, gerçekçi fiyatlı bir menü
 * görebilmek hem demoyu güçlendiriyor hem de müşterinin ilk kurulum
 * sürtünmesini azaltıyor. Fiyatlar örnek — işletme kendi fiyatlarına göre
 * tek tek düzenler, burada amaç "boş sayfa" korkusunu ortadan kaldırmak.
 *
 * Şablonlar Türkiye'deki yaygın işletme türlerine göre seçildi: kebapçı,
 * pizzacı, dönerci ve pastane, kafe/restoranla birlikte en çok karşımıza
 * çıkan tipler.
 */
export type SablonUrun = {
  ad: string;
  fiyatKurus?: number;
  aciklama?: string;
};

export type SablonKategori = {
  ad: string;
  urunler: SablonUrun[];
};

/** Kart rengi — SablonSecici'deki tema eşlemesinin anahtarı. */
export type SablonRenk =
  | "amber"
  | "orange"
  | "rose"
  | "emerald"
  | "sky"
  | "violet"
  | "red"
  | "teal"
  | "pink"
  | "indigo";

export type MenuSablonu = {
  id: string;
  ad: string;
  aciklama: string;
  ikon: string;
  renk: SablonRenk;
  /** Bu türlerde önerilir ama başka türde işletme de seçebilir. */
  onerilenTurler: BusinessType[];
  kategoriler: SablonKategori[];
};

const TL = (lira: number) => lira * 100;

/**
 * Yemek satan her yerde aynı olan içecek rafı. Tek tek yazmak yerine burada
 * duruyor: bir fiyat güncellemesi ya da yeni bir içecek tüm şablonlara aynı
 * anda yansısın.
 */
const ICECEKLER: SablonUrun[] = [
  { ad: "Su (0.5 lt)", fiyatKurus: TL(20) },
  { ad: "Ayran", fiyatKurus: TL(40) },
  { ad: "Şalgam Suyu", fiyatKurus: TL(45) },
  { ad: "Kola", fiyatKurus: TL(60) },
  { ad: "Fanta", fiyatKurus: TL(60) },
  { ad: "Sprite", fiyatKurus: TL(60) },
  { ad: "Soda", fiyatKurus: TL(35) },
  { ad: "Meyveli Soda", fiyatKurus: TL(45) },
  { ad: "Ice Tea Şeftali", fiyatKurus: TL(60) },
  { ad: "Ice Tea Limon", fiyatKurus: TL(60) },
  { ad: "Ice Tea Mango", fiyatKurus: TL(65) },
  { ad: "Limonata", fiyatKurus: TL(80) },
  { ad: "Taze Sıkılmış Portakal Suyu", fiyatKurus: TL(120) },
  { ad: "Çay", fiyatKurus: TL(30) },
  { ad: "Türk Kahvesi", fiyatKurus: TL(90) },
];

/** Sıcak içecek rafı — kafe/pastane tipi yerlerde ana bölüm. */
const SICAK_ICECEKLER: SablonUrun[] = [
  { ad: "Türk Kahvesi", fiyatKurus: TL(90) },
  { ad: "Double Türk Kahvesi", fiyatKurus: TL(120) },
  { ad: "Espresso", fiyatKurus: TL(90) },
  { ad: "Americano", fiyatKurus: TL(110) },
  { ad: "Filtre Kahve", fiyatKurus: TL(110) },
  { ad: "Latte", fiyatKurus: TL(130) },
  { ad: "Cappuccino", fiyatKurus: TL(130) },
  { ad: "Flat White", fiyatKurus: TL(140) },
  { ad: "Mocha", fiyatKurus: TL(150) },
  { ad: "Sıcak Çikolata", fiyatKurus: TL(120) },
  { ad: "Salep", fiyatKurus: TL(120) },
  { ad: "Çay", fiyatKurus: TL(30) },
  { ad: "Bitki Çayı", fiyatKurus: TL(70) },
];

const SOGUK_KAHVELER: SablonUrun[] = [
  { ad: "Ice Latte", fiyatKurus: TL(140) },
  { ad: "Ice Americano", fiyatKurus: TL(120) },
  { ad: "Ice Mocha", fiyatKurus: TL(160) },
  { ad: "Frappe", fiyatKurus: TL(150) },
  { ad: "Cold Brew", fiyatKurus: TL(150) },
  { ad: "Milkshake (Çilek/Muz/Çikolata)", fiyatKurus: TL(160) },
];

export const MENU_SABLONLARI: MenuSablonu[] = [
  {
    id: "kahve-dukkani",
    ad: "Kahve Dükkanı",
    aciklama: "Sıcak/soğuk kahveler, tatlılar ve atıştırmalıklar.",
    ikon: "☕",
    renk: "amber",
    onerilenTurler: ["yeme_icme"],
    kategoriler: [
      { ad: "Sıcak İçecekler", urunler: SICAK_ICECEKLER },
      { ad: "Soğuk Kahveler", urunler: SOGUK_KAHVELER },
      {
        ad: "Soğuk İçecekler",
        urunler: [
          { ad: "Limonata", fiyatKurus: TL(80) },
          { ad: "Ice Tea Şeftali", fiyatKurus: TL(60) },
          { ad: "Ice Tea Limon", fiyatKurus: TL(60) },
          { ad: "Ice Tea Mango", fiyatKurus: TL(65) },
          { ad: "Taze Sıkılmış Portakal Suyu", fiyatKurus: TL(120) },
          { ad: "Su (0.5 lt)", fiyatKurus: TL(20) },
        ],
      },
      {
        ad: "Tatlılar",
        urunler: [
          { ad: "Cheesecake", fiyatKurus: TL(170) },
          { ad: "San Sebastian", fiyatKurus: TL(190) },
          { ad: "Brownie", fiyatKurus: TL(150) },
          { ad: "Tiramisu", fiyatKurus: TL(170) },
          { ad: "Magnolia", fiyatKurus: TL(140) },
          { ad: "Cookie", fiyatKurus: TL(70) },
        ],
      },
      {
        ad: "Atıştırmalıklar",
        urunler: [
          { ad: "Kaşarlı Tost", fiyatKurus: TL(110) },
          { ad: "Karışık Tost", fiyatKurus: TL(130) },
          { ad: "Poğaça", fiyatKurus: TL(50) },
          { ad: "Simit", fiyatKurus: TL(30) },
          { ad: "Sandviç", fiyatKurus: TL(140) },
        ],
      },
    ],
  },
  {
    id: "kahvalti-kafe",
    ad: "Kahvaltı & Kafe",
    aciklama: "Serpme kahvaltı, tabaklar ve hafif ana yemekler.",
    ikon: "🍳",
    renk: "orange",
    onerilenTurler: ["yeme_icme"],
    kategoriler: [
      {
        ad: "Kahvaltılar",
        urunler: [
          { ad: "Serpme Kahvaltı (Kişi Başı)", fiyatKurus: TL(400) },
          { ad: "Serpme Kahvaltı (2 Kişilik)", fiyatKurus: TL(750) },
          { ad: "Kahvaltı Tabağı", fiyatKurus: TL(280) },
          { ad: "Menemen", fiyatKurus: TL(160) },
          { ad: "Sucuklu Yumurta", fiyatKurus: TL(170) },
          { ad: "Omlet", fiyatKurus: TL(150) },
          { ad: "Sahanda Yumurta", fiyatKurus: TL(120) },
          { ad: "Kaygana", fiyatKurus: TL(150) },
        ],
      },
      {
        ad: "Tostlar & Sandviçler",
        urunler: [
          { ad: "Kaşarlı Tost", fiyatKurus: TL(110) },
          { ad: "Karışık Tost", fiyatKurus: TL(130) },
          { ad: "Kumru", fiyatKurus: TL(160) },
          { ad: "Club Sandviç", fiyatKurus: TL(190) },
        ],
      },
      {
        ad: "Ana Yemekler",
        urunler: [
          { ad: "Izgara Köfte", fiyatKurus: TL(250) },
          { ad: "Tavuk Şinitzel", fiyatKurus: TL(230) },
          { ad: "Izgara Tavuk", fiyatKurus: TL(240) },
          { ad: "Alfredo Makarna", fiyatKurus: TL(200) },
          { ad: "Napoliten Makarna", fiyatKurus: TL(180) },
        ],
      },
      {
        ad: "Salatalar",
        urunler: [
          { ad: "Sezar Salata", fiyatKurus: TL(200) },
          { ad: "Akdeniz Salata", fiyatKurus: TL(180) },
          { ad: "Mevsim Salata", fiyatKurus: TL(120) },
        ],
      },
      { ad: "İçecekler", urunler: [...SICAK_ICECEKLER.slice(0, 8), ...ICECEKLER.slice(0, 12)] },
      {
        ad: "Tatlılar",
        urunler: [
          { ad: "Sütlaç", fiyatKurus: TL(100) },
          { ad: "Künefe", fiyatKurus: TL(180) },
          { ad: "Cheesecake", fiyatKurus: TL(170) },
          { ad: "Bal Kaymak", fiyatKurus: TL(160) },
        ],
      },
    ],
  },
  {
    id: "restoran-lokanta",
    ad: "Restoran / Lokanta",
    aciklama: "Çorba, ana yemek, pilav ve tatlıyla klasik lokanta düzeni.",
    ikon: "🍽️",
    renk: "rose",
    onerilenTurler: ["yeme_icme"],
    kategoriler: [
      {
        ad: "Çorbalar",
        urunler: [
          { ad: "Mercimek Çorbası", fiyatKurus: TL(90) },
          { ad: "Ezogelin Çorbası", fiyatKurus: TL(90) },
          { ad: "Yayla Çorbası", fiyatKurus: TL(90) },
          { ad: "İşkembe Çorbası", fiyatKurus: TL(130) },
          { ad: "Domates Çorbası", fiyatKurus: TL(90) },
        ],
      },
      {
        ad: "Başlangıçlar",
        urunler: [
          { ad: "Humus", fiyatKurus: TL(110) },
          { ad: "Haydari", fiyatKurus: TL(100) },
          { ad: "Acılı Ezme", fiyatKurus: TL(100) },
          { ad: "Sigara Böreği", fiyatKurus: TL(130) },
          { ad: "Kalamar Tava", fiyatKurus: TL(280) },
        ],
      },
      {
        ad: "Ana Yemekler",
        urunler: [
          { ad: "Izgara Tavuk", fiyatKurus: TL(250) },
          { ad: "Izgara Köfte", fiyatKurus: TL(260) },
          { ad: "Karışık Izgara", fiyatKurus: TL(450) },
          { ad: "Kuzu Pirzola", fiyatKurus: TL(420) },
          { ad: "Tavuk Şinitzel", fiyatKurus: TL(230) },
          { ad: "Etli Güveç", fiyatKurus: TL(320) },
          { ad: "Karnıyarık", fiyatKurus: TL(220) },
        ],
      },
      {
        ad: "Pilav & Makarna",
        urunler: [
          { ad: "Pirinç Pilavı", fiyatKurus: TL(80) },
          { ad: "Bulgur Pilavı", fiyatKurus: TL(80) },
          { ad: "Fettuccine Alfredo", fiyatKurus: TL(200) },
          { ad: "Penne Arabiata", fiyatKurus: TL(190) },
        ],
      },
      {
        ad: "Salatalar",
        urunler: [
          { ad: "Çoban Salata", fiyatKurus: TL(120) },
          { ad: "Mevsim Salata", fiyatKurus: TL(110) },
          { ad: "Sezar Salata", fiyatKurus: TL(200) },
          { ad: "Gavurdağı Salata", fiyatKurus: TL(140) },
        ],
      },
      { ad: "İçecekler", urunler: ICECEKLER },
      {
        ad: "Tatlılar",
        urunler: [
          { ad: "Künefe", fiyatKurus: TL(180) },
          { ad: "Baklava (Porsiyon)", fiyatKurus: TL(170) },
          { ad: "Kazandibi", fiyatKurus: TL(120) },
          { ad: "Sütlaç", fiyatKurus: TL(100) },
          { ad: "Trileçe", fiyatKurus: TL(140) },
        ],
      },
    ],
  },
  {
    id: "kebapci-ocakbasi",
    ad: "Kebapçı / Ocakbaşı",
    aciklama: "Kebaplar, dürümler, pideler ve mezelerle ocakbaşı düzeni.",
    ikon: "🥙",
    renk: "red",
    onerilenTurler: ["yeme_icme"],
    kategoriler: [
      {
        ad: "Kebaplar",
        urunler: [
          { ad: "Adana Kebap", fiyatKurus: TL(320) },
          { ad: "Urfa Kebap", fiyatKurus: TL(320) },
          { ad: "Beyti Kebap", fiyatKurus: TL(380) },
          { ad: "Ali Nazik", fiyatKurus: TL(390) },
          { ad: "İskender", fiyatKurus: TL(360) },
          { ad: "Tavuk Şiş", fiyatKurus: TL(280) },
          { ad: "Kuzu Şiş", fiyatKurus: TL(400) },
          { ad: "Patlıcan Kebap", fiyatKurus: TL(350) },
        ],
      },
      {
        ad: "Dürümler",
        urunler: [
          { ad: "Adana Dürüm", fiyatKurus: TL(220) },
          { ad: "Tavuk Dürüm", fiyatKurus: TL(180) },
          { ad: "Et Döner Dürüm", fiyatKurus: TL(250) },
          { ad: "Lahmacun Dürüm", fiyatKurus: TL(120) },
        ],
      },
      {
        ad: "Pide & Lahmacun",
        urunler: [
          { ad: "Kıymalı Pide", fiyatKurus: TL(220) },
          { ad: "Kaşarlı Pide", fiyatKurus: TL(210) },
          { ad: "Kuşbaşılı Pide", fiyatKurus: TL(260) },
          { ad: "Kuşbaşılı Kaşarlı Pide", fiyatKurus: TL(280) },
          { ad: "Lahmacun", fiyatKurus: TL(90) },
        ],
      },
      {
        ad: "Mezeler & Başlangıç",
        urunler: [
          { ad: "Acılı Ezme", fiyatKurus: TL(100) },
          { ad: "Haydari", fiyatKurus: TL(100) },
          { ad: "Humus", fiyatKurus: TL(110) },
          { ad: "Şakşuka", fiyatKurus: TL(110) },
          { ad: "Mercimek Çorbası", fiyatKurus: TL(90) },
        ],
      },
      {
        ad: "Salatalar",
        urunler: [
          { ad: "Çoban Salata", fiyatKurus: TL(120) },
          { ad: "Gavurdağı Salata", fiyatKurus: TL(140) },
          { ad: "Roka Salata", fiyatKurus: TL(110) },
        ],
      },
      { ad: "İçecekler", urunler: ICECEKLER },
      {
        ad: "Tatlılar",
        urunler: [
          { ad: "Künefe", fiyatKurus: TL(180) },
          { ad: "Baklava (Porsiyon)", fiyatKurus: TL(170) },
          { ad: "Katmer", fiyatKurus: TL(200) },
          { ad: "Kadayıf", fiyatKurus: TL(160) },
        ],
      },
    ],
  },
  {
    id: "pizzaci",
    ad: "Pizzacı",
    aciklama: "Pizzalar, makarnalar ve İtalyan başlangıçları.",
    ikon: "🍕",
    renk: "orange",
    onerilenTurler: ["yeme_icme"],
    kategoriler: [
      {
        ad: "Pizzalar",
        urunler: [
          { ad: "Margherita", fiyatKurus: TL(240) },
          { ad: "Sucuklu Pizza", fiyatKurus: TL(280) },
          { ad: "Karışık Pizza", fiyatKurus: TL(300) },
          { ad: "Pepperoni", fiyatKurus: TL(310) },
          { ad: "Quattro Formaggi", fiyatKurus: TL(330) },
          { ad: "Vejetaryen Pizza", fiyatKurus: TL(270) },
          { ad: "Tavuklu Pizza", fiyatKurus: TL(290) },
          { ad: "BBQ Chicken", fiyatKurus: TL(320) },
        ],
      },
      {
        ad: "Makarnalar",
        urunler: [
          { ad: "Spaghetti Bolognese", fiyatKurus: TL(230) },
          { ad: "Fettuccine Alfredo", fiyatKurus: TL(240) },
          { ad: "Penne Arabiata", fiyatKurus: TL(210) },
          { ad: "Pesto Makarna", fiyatKurus: TL(230) },
          { ad: "Lazanya", fiyatKurus: TL(280) },
        ],
      },
      {
        ad: "Başlangıçlar",
        urunler: [
          { ad: "Sarımsaklı Ekmek", fiyatKurus: TL(90) },
          { ad: "Mozzarella Stick", fiyatKurus: TL(160) },
          { ad: "Soğan Halkası", fiyatKurus: TL(120) },
          { ad: "Patates Kızartması", fiyatKurus: TL(110) },
          { ad: "Bruschetta", fiyatKurus: TL(140) },
        ],
      },
      {
        ad: "Salatalar",
        urunler: [
          { ad: "Sezar Salata", fiyatKurus: TL(200) },
          { ad: "Akdeniz Salata", fiyatKurus: TL(180) },
          { ad: "Mevsim Salata", fiyatKurus: TL(120) },
        ],
      },
      { ad: "İçecekler", urunler: ICECEKLER.slice(0, 13) },
      {
        ad: "Tatlılar",
        urunler: [
          { ad: "Tiramisu", fiyatKurus: TL(170) },
          { ad: "Brownie", fiyatKurus: TL(150) },
          { ad: "Çikolatalı Sufle", fiyatKurus: TL(170) },
        ],
      },
    ],
  },
  {
    id: "burger-fast-food",
    ad: "Burger & Fast Food",
    aciklama: "Burgerler, tavuk ürünleri ve yan lezzetler.",
    ikon: "🍔",
    renk: "amber",
    onerilenTurler: ["yeme_icme"],
    kategoriler: [
      {
        ad: "Burgerler",
        urunler: [
          { ad: "Klasik Burger", fiyatKurus: TL(200) },
          { ad: "Cheeseburger", fiyatKurus: TL(220) },
          { ad: "Double Cheeseburger", fiyatKurus: TL(300) },
          { ad: "BBQ Burger", fiyatKurus: TL(260) },
          { ad: "Mantarlı Burger", fiyatKurus: TL(260) },
          { ad: "Acılı Burger", fiyatKurus: TL(250) },
          { ad: "Tavuk Burger", fiyatKurus: TL(190) },
          { ad: "Vejetaryen Burger", fiyatKurus: TL(210) },
        ],
      },
      {
        ad: "Tavuk Ürünleri",
        urunler: [
          { ad: "Chicken Tenders (6'lı)", fiyatKurus: TL(200) },
          { ad: "Kanat (8'li)", fiyatKurus: TL(230) },
          { ad: "Tavuk Nugget (9'lu)", fiyatKurus: TL(180) },
        ],
      },
      {
        ad: "Sandviç & Tost",
        urunler: [
          { ad: "Kaşarlı Tost", fiyatKurus: TL(110) },
          { ad: "Karışık Tost", fiyatKurus: TL(130) },
          { ad: "Ayvalık Tostu", fiyatKurus: TL(160) },
          { ad: "Kumru", fiyatKurus: TL(160) },
        ],
      },
      {
        ad: "Yan Ürünler",
        urunler: [
          { ad: "Patates Kızartması", fiyatKurus: TL(110) },
          { ad: "Cheddarlı Patates", fiyatKurus: TL(150) },
          { ad: "Soğan Halkası", fiyatKurus: TL(120) },
          { ad: "Mozzarella Stick", fiyatKurus: TL(160) },
          { ad: "Coleslaw", fiyatKurus: TL(70) },
        ],
      },
      { ad: "İçecekler", urunler: ICECEKLER.slice(0, 13) },
      {
        ad: "Tatlılar",
        urunler: [
          { ad: "Milkshake (Çilek/Muz/Çikolata)", fiyatKurus: TL(160) },
          { ad: "Brownie", fiyatKurus: TL(150) },
          { ad: "Dondurma (Top)", fiyatKurus: TL(60) },
        ],
      },
    ],
  },
  {
    id: "donerci-bufe",
    ad: "Dönerci / Büfe",
    aciklama: "Döner, dürüm, tost ve çorbayla hızlı servis.",
    ikon: "🌯",
    renk: "teal",
    onerilenTurler: ["yeme_icme"],
    kategoriler: [
      {
        ad: "Dönerler",
        urunler: [
          { ad: "Et Döner Dürüm", fiyatKurus: TL(250) },
          { ad: "Tavuk Döner Dürüm", fiyatKurus: TL(180) },
          { ad: "Et Döner Ekmek Arası", fiyatKurus: TL(230) },
          { ad: "Tavuk Döner Ekmek Arası", fiyatKurus: TL(170) },
          { ad: "Porsiyon Et Döner", fiyatKurus: TL(340) },
          { ad: "Porsiyon Tavuk Döner", fiyatKurus: TL(260) },
          { ad: "İskender", fiyatKurus: TL(360) },
        ],
      },
      {
        ad: "Tost & Sandviç",
        urunler: [
          { ad: "Kaşarlı Tost", fiyatKurus: TL(110) },
          { ad: "Karışık Tost", fiyatKurus: TL(130) },
          { ad: "Sucuk Ekmek", fiyatKurus: TL(150) },
          { ad: "Kumru", fiyatKurus: TL(160) },
        ],
      },
      {
        ad: "Çorbalar",
        urunler: [
          { ad: "Mercimek Çorbası", fiyatKurus: TL(90) },
          { ad: "İşkembe Çorbası", fiyatKurus: TL(130) },
          { ad: "Ezogelin Çorbası", fiyatKurus: TL(90) },
        ],
      },
      {
        ad: "Yan Ürünler",
        urunler: [
          { ad: "Patates Kızartması", fiyatKurus: TL(110) },
          { ad: "Pilav", fiyatKurus: TL(80) },
          { ad: "Turşu", fiyatKurus: TL(50) },
        ],
      },
      { ad: "İçecekler", urunler: ICECEKLER.slice(0, 13) },
    ],
  },
  {
    id: "balik-restorani",
    ad: "Balık Restoranı",
    aciklama: "Mezeler, ara sıcaklar, balıklar ve rakı sofrası.",
    ikon: "🐟",
    renk: "sky",
    onerilenTurler: ["balikci"],
    kategoriler: [
      {
        ad: "Soğuk Mezeler",
        urunler: [
          { ad: "Haydari", fiyatKurus: TL(110) },
          { ad: "Acılı Ezme", fiyatKurus: TL(110) },
          { ad: "Fava", fiyatKurus: TL(130) },
          { ad: "Atom", fiyatKurus: TL(130) },
          { ad: "Deniz Börülcesi", fiyatKurus: TL(140) },
          { ad: "Lakerda", fiyatKurus: TL(260) },
          { ad: "Çiroz", fiyatKurus: TL(200) },
          { ad: "Rus Salatası", fiyatKurus: TL(120) },
          { ad: "Semizotu", fiyatKurus: TL(110) },
        ],
      },
      {
        ad: "Ara Sıcaklar",
        urunler: [
          { ad: "Kalamar Tava", fiyatKurus: TL(320) },
          { ad: "Karides Güveç", fiyatKurus: TL(390) },
          { ad: "Ahtapot Izgara", fiyatKurus: TL(450) },
          { ad: "Midye Tava", fiyatKurus: TL(280) },
          { ad: "Sigara Böreği", fiyatKurus: TL(140) },
          { ad: "Karides Tava", fiyatKurus: TL(360) },
          { ad: "Paçanga Böreği", fiyatKurus: TL(180) },
        ],
      },
      {
        ad: "Balıklar",
        urunler: [
          { ad: "Levrek (Izgara)", fiyatKurus: TL(420) },
          { ad: "Çupra (Izgara)", fiyatKurus: TL(420) },
          { ad: "Somon (Izgara)", fiyatKurus: TL(460) },
          { ad: "Hamsi Tava", fiyatKurus: TL(280) },
          { ad: "Palamut (Izgara)", fiyatKurus: TL(340) },
          { ad: "Mezgit Tava", fiyatKurus: TL(300) },
          { ad: "Barbun Tava", fiyatKurus: TL(380) },
          { ad: "Lüfer (Izgara)", fiyatKurus: TL(480) },
        ],
      },
      {
        ad: "Salatalar",
        urunler: [
          { ad: "Mevsim Salata", fiyatKurus: TL(120) },
          { ad: "Roka Salata", fiyatKurus: TL(120) },
          { ad: "Deniz Mahsulleri Salatası", fiyatKurus: TL(280) },
        ],
      },
      {
        ad: "İçkiler",
        urunler: [
          { ad: "Rakı (Duble)", fiyatKurus: TL(280) },
          { ad: "Rakı (Tek)", fiyatKurus: TL(160) },
          { ad: "Beyaz Şarap (Kadeh)", fiyatKurus: TL(220) },
          { ad: "Kırmızı Şarap (Kadeh)", fiyatKurus: TL(220) },
          { ad: "Bira", fiyatKurus: TL(140) },
          { ad: "Votka (Tek)", fiyatKurus: TL(200) },
        ],
      },
      { ad: "İçecekler", urunler: ICECEKLER.slice(0, 12) },
      {
        ad: "Tatlılar",
        urunler: [
          { ad: "Künefe", fiyatKurus: TL(180) },
          { ad: "İrmik Helvası", fiyatKurus: TL(130) },
          { ad: "Mevsim Meyveleri", fiyatKurus: TL(160) },
        ],
      },
    ],
  },
  {
    id: "bar-gece-kulubu",
    ad: "Bar / Gece Kulübü",
    aciklama: "Kokteyller, içkiler, shotlar ve atıştırmalıklar.",
    ikon: "🍸",
    renk: "violet",
    onerilenTurler: ["gece_kulubu"],
    kategoriler: [
      {
        ad: "Kokteyller",
        urunler: [
          { ad: "Mojito", fiyatKurus: TL(280) },
          { ad: "Margarita", fiyatKurus: TL(300) },
          { ad: "Cosmopolitan", fiyatKurus: TL(300) },
          { ad: "Long Island Ice Tea", fiyatKurus: TL(350) },
          { ad: "Piña Colada", fiyatKurus: TL(310) },
          { ad: "Negroni", fiyatKurus: TL(320) },
          { ad: "Old Fashioned", fiyatKurus: TL(340) },
          { ad: "Aperol Spritz", fiyatKurus: TL(320) },
          { ad: "Sex on the Beach", fiyatKurus: TL(300) },
          { ad: "Tequila Sunrise", fiyatKurus: TL(300) },
          { ad: "Whiskey Sour", fiyatKurus: TL(330) },
          { ad: "Gin Tonic", fiyatKurus: TL(280) },
        ],
      },
      {
        ad: "Yüksek İçkiler",
        urunler: [
          { ad: "Votka (Tek)", fiyatKurus: TL(200) },
          { ad: "Votka (Duble)", fiyatKurus: TL(340) },
          { ad: "Viski (Tek)", fiyatKurus: TL(250) },
          { ad: "Viski (Duble)", fiyatKurus: TL(430) },
          { ad: "Cin (Tek)", fiyatKurus: TL(220) },
          { ad: "Tekila (Tek)", fiyatKurus: TL(240) },
          { ad: "Rom (Tek)", fiyatKurus: TL(220) },
          { ad: "Rakı (Duble)", fiyatKurus: TL(280) },
        ],
      },
      {
        ad: "Biralar",
        urunler: [
          { ad: "Fıçı Bira (50 cl)", fiyatKurus: TL(160) },
          { ad: "Fıçı Bira (33 cl)", fiyatKurus: TL(120) },
          { ad: "Şişe Bira", fiyatKurus: TL(140) },
          { ad: "İthal Bira", fiyatKurus: TL(200) },
        ],
      },
      {
        ad: "Şaraplar",
        urunler: [
          { ad: "Beyaz Şarap (Kadeh)", fiyatKurus: TL(220) },
          { ad: "Kırmızı Şarap (Kadeh)", fiyatKurus: TL(220) },
          { ad: "Rose (Kadeh)", fiyatKurus: TL(230) },
          { ad: "Şarap (Şişe)", fiyatKurus: TL(950) },
        ],
      },
      {
        ad: "Shotlar",
        urunler: [
          { ad: "Tekila Shot", fiyatKurus: TL(160) },
          { ad: "Jägermeister", fiyatKurus: TL(180) },
          { ad: "Sambuca", fiyatKurus: TL(170) },
          { ad: "B-52", fiyatKurus: TL(190) },
        ],
      },
      {
        ad: "Alkolsüz",
        urunler: [
          { ad: "Virgin Mojito", fiyatKurus: TL(180) },
          { ad: "Kola", fiyatKurus: TL(70) },
          { ad: "Soda", fiyatKurus: TL(40) },
          { ad: "Meyveli Soda", fiyatKurus: TL(50) },
          { ad: "Enerji İçeceği", fiyatKurus: TL(120) },
          { ad: "Su (0.5 lt)", fiyatKurus: TL(25) },
        ],
      },
      {
        ad: "Atıştırmalıklar",
        urunler: [
          { ad: "Karışık Kuruyemiş", fiyatKurus: TL(120) },
          { ad: "Patates Kızartması", fiyatKurus: TL(120) },
          { ad: "Soğan Halkası", fiyatKurus: TL(130) },
          { ad: "Peynir Tabağı", fiyatKurus: TL(280) },
          { ad: "Nachos", fiyatKurus: TL(190) },
        ],
      },
    ],
  },
  {
    id: "pastane-tatlici",
    ad: "Pastane / Tatlıcı",
    aciklama: "Pastalar, şerbetli ve sütlü tatlılar, sıcak içecekler.",
    ikon: "🍰",
    renk: "pink",
    onerilenTurler: ["yeme_icme"],
    kategoriler: [
      {
        ad: "Pastalar",
        urunler: [
          { ad: "Çikolatalı Pasta (Dilim)", fiyatKurus: TL(150) },
          { ad: "Meyveli Pasta (Dilim)", fiyatKurus: TL(150) },
          { ad: "Cheesecake", fiyatKurus: TL(170) },
          { ad: "San Sebastian", fiyatKurus: TL(190) },
          { ad: "Tiramisu", fiyatKurus: TL(170) },
          { ad: "Profiterol", fiyatKurus: TL(150) },
        ],
      },
      {
        ad: "Şerbetli Tatlılar",
        urunler: [
          { ad: "Baklava (Porsiyon)", fiyatKurus: TL(170) },
          { ad: "Künefe", fiyatKurus: TL(180) },
          { ad: "Kadayıf", fiyatKurus: TL(160) },
          { ad: "Şöbiyet", fiyatKurus: TL(180) },
          { ad: "Tulumba", fiyatKurus: TL(110) },
          { ad: "Revani", fiyatKurus: TL(110) },
        ],
      },
      {
        ad: "Sütlü Tatlılar",
        urunler: [
          { ad: "Sütlaç", fiyatKurus: TL(100) },
          { ad: "Kazandibi", fiyatKurus: TL(120) },
          { ad: "Trileçe", fiyatKurus: TL(140) },
          { ad: "Magnolia", fiyatKurus: TL(140) },
          { ad: "Supangle", fiyatKurus: TL(130) },
          { ad: "Muhallebi", fiyatKurus: TL(100) },
        ],
      },
      {
        ad: "Kurabiye & Börek",
        urunler: [
          { ad: "Kurabiye (100 gr)", fiyatKurus: TL(90) },
          { ad: "Poğaça", fiyatKurus: TL(50) },
          { ad: "Açma", fiyatKurus: TL(50) },
          { ad: "Su Böreği (Dilim)", fiyatKurus: TL(90) },
          { ad: "Simit", fiyatKurus: TL(30) },
        ],
      },
      { ad: "Sıcak İçecekler", urunler: SICAK_ICECEKLER },
      { ad: "Soğuk İçecekler", urunler: [...SOGUK_KAHVELER, ...ICECEKLER.slice(0, 13)] },
    ],
  },
];
