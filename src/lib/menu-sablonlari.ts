import type { BusinessType } from "./constants";

/**
 * Hazır menü şablonları.
 *
 * Satış ziyaretinde boş bir menüyle "siz doldurun" demek zayıf bir gösterim;
 * bir şablon seçip saniyeler içinde dolu, gerçekçi fiyatlı bir menü
 * görebilmek hem demoyu güçlendiriyor hem de müşterinin ilk kurulum
 * sürtünmesini azaltıyor. Fiyatlar örnek — işletme kendi fiyatlarına göre
 * tek tek düzenler, burada amaç "boş sayfa" korkusunu ortadan kaldırmak.
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

export type MenuSablonu = {
  id: string;
  ad: string;
  aciklama: string;
  /** Bu türlerde önerilir ama başka türde işletme de seçebilir. */
  onerilenTurler: BusinessType[];
  kategoriler: SablonKategori[];
};

const TL = (lira: number) => lira * 100;

export const MENU_SABLONLARI: MenuSablonu[] = [
  {
    id: "kahve-dukkani",
    ad: "Kahve & Tatlı",
    aciklama: "Sıcak/soğuk içecek ve tatlı ağırlıklı, kahve dükkanı tipi.",
    onerilenTurler: ["yeme_icme"],
    kategoriler: [
      {
        ad: "Sıcak İçecekler",
        urunler: [
          { ad: "Türk Kahvesi", fiyatKurus: TL(90) },
          { ad: "Filtre Kahve", fiyatKurus: TL(110) },
          { ad: "Cappuccino", fiyatKurus: TL(120) },
          { ad: "Latte", fiyatKurus: TL(130) },
          { ad: "Sıcak Çikolata", fiyatKurus: TL(110) },
        ],
      },
      {
        ad: "Soğuk İçecekler",
        urunler: [
          { ad: "Ice Latte", fiyatKurus: TL(140) },
          { ad: "Limonata", fiyatKurus: TL(90) },
          { ad: "Soğuk Çay", fiyatKurus: TL(80) },
        ],
      },
      {
        ad: "Tatlılar",
        urunler: [
          { ad: "Cheesecake", fiyatKurus: TL(160) },
          { ad: "Brownie", fiyatKurus: TL(140) },
          { ad: "Kurabiye", fiyatKurus: TL(60) },
        ],
      },
    ],
  },
  {
    id: "kahvalti-kafe",
    ad: "Kahvaltı & Kafe",
    aciklama: "Kahvaltı tabakları ve hafif ana yemekler sunan kafeler için.",
    onerilenTurler: ["yeme_icme"],
    kategoriler: [
      {
        ad: "Kahvaltılar",
        urunler: [
          { ad: "Serpme Kahvaltı (Tabak)", fiyatKurus: TL(350) },
          { ad: "Menemen", fiyatKurus: TL(150) },
          { ad: "Omlet", fiyatKurus: TL(140) },
          { ad: "Sahanda Yumurta", fiyatKurus: TL(110) },
        ],
      },
      {
        ad: "Ana Yemekler",
        urunler: [
          { ad: "Izgara Köfte", fiyatKurus: TL(220) },
          { ad: "Tavuk Şinitzel", fiyatKurus: TL(210) },
          { ad: "Makarna", fiyatKurus: TL(170) },
        ],
      },
      {
        ad: "İçecekler",
        urunler: [
          { ad: "Çay", fiyatKurus: TL(30) },
          { ad: "Türk Kahvesi", fiyatKurus: TL(90) },
          { ad: "Taze Sıkılmış Portakal Suyu", fiyatKurus: TL(120) },
        ],
      },
      {
        ad: "Tatlılar",
        urunler: [
          { ad: "Sütlaç", fiyatKurus: TL(90) },
          { ad: "Baklava (Porsiyon)", fiyatKurus: TL(140) },
        ],
      },
    ],
  },
  {
    id: "restoran-lokanta",
    ad: "Restoran / Lokanta",
    aciklama: "Çorba, ana yemek ve salata bölümleriyle klasik restoran düzeni.",
    onerilenTurler: ["yeme_icme"],
    kategoriler: [
      {
        ad: "Çorbalar",
        urunler: [
          { ad: "Mercimek Çorbası", fiyatKurus: TL(90) },
          { ad: "Ezogelin Çorbası", fiyatKurus: TL(90) },
        ],
      },
      {
        ad: "Ana Yemekler",
        urunler: [
          { ad: "Izgara Tavuk", fiyatKurus: TL(230) },
          { ad: "Karışık Izgara", fiyatKurus: TL(420) },
          { ad: "Kuzu Pirzola", fiyatKurus: TL(380) },
        ],
      },
      {
        ad: "Salatalar",
        urunler: [
          { ad: "Çoban Salata", fiyatKurus: TL(110) },
          { ad: "Mevsim Salata", fiyatKurus: TL(100) },
        ],
      },
      {
        ad: "Tatlılar",
        urunler: [
          { ad: "Künefe", fiyatKurus: TL(160) },
          { ad: "Kazandibi", fiyatKurus: TL(110) },
        ],
      },
    ],
  },
  {
    id: "fast-food-bufe",
    ad: "Fast Food / Büfe",
    aciklama: "Burger, tost ve atıştırmalık ağırlıklı hızlı servis menüsü.",
    onerilenTurler: ["yeme_icme"],
    kategoriler: [
      {
        ad: "Burgerler",
        urunler: [
          { ad: "Klasik Burger", fiyatKurus: TL(160) },
          { ad: "Cheeseburger", fiyatKurus: TL(180) },
          { ad: "Tavuk Burger", fiyatKurus: TL(150) },
        ],
      },
      {
        ad: "Sandviç & Tost",
        urunler: [
          { ad: "Kaşarlı Tost", fiyatKurus: TL(90) },
          { ad: "Karışık Sandviç", fiyatKurus: TL(110) },
        ],
      },
      {
        ad: "Atıştırmalıklar",
        urunler: [
          { ad: "Patates Kızartması", fiyatKurus: TL(90) },
          { ad: "Soğan Halkası", fiyatKurus: TL(100) },
        ],
      },
      {
        ad: "İçecekler",
        urunler: [
          { ad: "Kola", fiyatKurus: TL(50) },
          { ad: "Ayran", fiyatKurus: TL(40) },
        ],
      },
    ],
  },
  {
    id: "balik-restorani",
    ad: "Balık Restoranı",
    aciklama: "Meze, balık ve deniz ürünleri ağırlıklı menü.",
    onerilenTurler: ["balikci"],
    kategoriler: [
      {
        ad: "Mezeler",
        urunler: [
          { ad: "Soğuk Meze Tabağı", fiyatKurus: TL(220) },
          { ad: "Sıcak Meze", fiyatKurus: TL(180) },
        ],
      },
      {
        ad: "Balıklar",
        urunler: [
          { ad: "Levrek (Izgara)", fiyatKurus: TL(380) },
          { ad: "Çupra (Izgara)", fiyatKurus: TL(380) },
          { ad: "Kalamar Tava", fiyatKurus: TL(320) },
        ],
      },
      {
        ad: "Salatalar",
        urunler: [{ ad: "Deniz Mahsulleri Salatası", fiyatKurus: TL(260) }],
      },
      {
        ad: "İçecekler",
        urunler: [
          { ad: "Rakı (Duble)", fiyatKurus: TL(250) },
          { ad: "Şarap (Kadeh)", fiyatKurus: TL(200) },
        ],
      },
    ],
  },
  {
    id: "bar-gece-kulubu",
    ad: "Bar / Gece Kulübü",
    aciklama: "İçki, kokteyl ve hafif atıştırmalık menüsü.",
    onerilenTurler: ["gece_kulubu"],
    kategoriler: [
      {
        ad: "İçkiler",
        urunler: [
          { ad: "Bira", fiyatKurus: TL(120) },
          { ad: "Votka (Tek)", fiyatKurus: TL(180) },
          { ad: "Viski (Tek)", fiyatKurus: TL(220) },
        ],
      },
      {
        ad: "Kokteyller",
        urunler: [
          { ad: "Mojito", fiyatKurus: TL(220) },
          { ad: "Margarita", fiyatKurus: TL(240) },
        ],
      },
      {
        ad: "Atıştırmalıklar",
        urunler: [
          { ad: "Patates Kızartması", fiyatKurus: TL(100) },
          { ad: "Karışık Kuruyemiş", fiyatKurus: TL(90) },
        ],
      },
    ],
  },
];
