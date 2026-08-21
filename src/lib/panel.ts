import type { Role } from "./session-token";

/**
 * Panelin iki ayrı yüzü.
 *
 * Platform yöneticisi hiçbir işletmenin sahibi değil: onun için "Özet",
 * "Geri bildirimler", "İleti izinleri" gibi ekranlar anlamsız — kiminkini
 * göreceği bile belirsiz. O yüzden panel iki moda ayrıldı:
 *
 * - `platform`: hesapları, işletmeleri, kullanıcıları yönetir; denetim
 *   kaydına ve sistem sağlığına bakar. Kiracı verisi görmez.
 * - `kiraci`:   bir işletmenin günlük işi. Platform yöneticisi bir hesaba
 *   "girdiğinde" (impersonation) o da bu modu görür.
 * - `personel`: saha personeli (garson). Rapor, ayar, kullanıcı ekranı
 *   yok — yalnızca kendi vardiyasını ve günlük görevleri görür.
 *
 * Menü ile sayfa korumaları aynı kaynaktan beslenmeli: burada görünen her
 * bağlantının arkasında o rolü kabul eden bir `require*` kapısı var.
 */
export type PanelModu = "platform" | "kiraci" | "personel";

export function panelModu(role: Role, aktifHesapVar: boolean): PanelModu {
  if (role === "garson") return "personel";
  return role === "superadmin" && !aktifHesapVar ? "platform" : "kiraci";
}

export type IkonAdi =
  | "pano"
  | "mesaj"
  | "grafik"
  | "yildiz"
  | "menu"
  | "bina"
  | "kiyas"
  | "izin"
  | "kisi"
  | "hesap"
  | "abonelik"
  | "denetim"
  | "sistem"
  | "profil"
  | "entegrasyon"
  | "takvim"
  | "gorev"
  | "duyuru";

export type AltNavLink = {
  href: string;
  label: string;
  /** Yalnızca tam eşleşmede aktif sayılır (liste kökü, "Ekle" ile karışmasın). */
  exact?: boolean;
};

export type NavLink = {
  href: string;
  label: string;
  ikon: IkonAdi;
  /** Yalnızca tam eşleşmede aktif sayılır (kök adres için). */
  exact?: boolean;
  /** Doluysa satır kendisi bir sayfa değil, açılır bir alt liste başlığıdır. */
  altLinkler?: AltNavLink[];
};

export type NavGrup = { baslik: string; linkler: NavLink[] };

/** Hesabın tamamını yönetebilen roller — kullanıcı, izin, işletme ekranları. */
function yonetici(role: Role): boolean {
  return role === "owner" || role === "superadmin";
}

/**
 * Bir kullanıcının açabileceği roller.
 *
 * Hesap sahibi kendi ekibini kurar ama ikinci bir "sahip" açamaz: sahiplik
 * aboneliği ve faturayı taşıyan roldür, onu platform tarafı belirler. Bu
 * sınır olmadan bir hesapta kimin yetkili olduğu belirsizleşiyor ve
 * müşterinin kendi hesabından bizim göremediğimiz sahipler türeyebiliyordu.
 */
export function acilabilirRoller(actorRole: Role): Role[] {
  if (actorRole === "superadmin") return ["owner", "bolge", "manager", "viewer", "garson"];
  if (actorRole === "owner") return ["bolge", "manager", "viewer", "garson"];
  return [];
}

export type ModulIzinleri = { menuIzni: boolean; anketIzni: boolean };

export function panelMenusu(
  modu: PanelModu,
  role: Role,
  izinler: ModulIzinleri = { menuIzni: true, anketIzni: true },
  /** Hesabın tek işletmesi varsa kimliği — "Düzenle" kısayolu doğrudan ona gider. */
  tekIsletmeId: string | null = null,
): NavGrup[] {
  if (modu === "personel") {
    return [
      {
        baslik: "Ben",
        linkler: [
          { href: "/admin/vardiyalarim", label: "Vardiyalarım", ikon: "takvim", exact: true },
          { href: "/admin/gorevlerim", label: "Görevlerim", ikon: "gorev" },
        ],
      },
    ];
  }

  if (modu === "platform") {
    return [
      {
        baslik: "Platform",
        linkler: [
          { href: "/admin/hesaplar", label: "Hesaplar", ikon: "hesap" },
          { href: "/admin/abonelikler", label: "Abonelikler", ikon: "abonelik" },
          { href: "/admin/isletmeler", label: "İşletmeler", ikon: "bina" },
          {
            href: "/admin/kullanicilar",
            label: "Kullanıcılar",
            ikon: "kisi",
            altLinkler: [
              { href: "/admin/kullanicilar", label: "Listele", exact: true },
              { href: "/admin/kullanicilar/ekle", label: "Ekle" },
            ],
          },
        ],
      },
      {
        baslik: "Denetim",
        linkler: [
          { href: "/admin/denetim", label: "Denetim kaydı", ikon: "denetim" },
          { href: "/admin/sistem", label: "Sistem sağlığı", ikon: "sistem" },
        ],
      },
    ];
  }

  const gunluk: NavLink[] = [
    { href: "/admin", label: "Özet", ikon: "pano", exact: true },
  ];
  // Geri bildirimler ve QR Menü modül bazlı kısıtlanabilir; sahip/platform
  // yöneticisi her zaman görür (izinler zaten getSession'da true'ya sabitlenir).
  //
  // Vardiya & masa ve Ürün puanları eskiden ayrı üst düzey sekmelerdi; aynı
  // geri bildirim verisinin farklı kesitleri olduğu için tek başlık altında
  // toplandı — beş dağınık rapor sekmesi yerine tek bir "Geri bildirimler"
  // modülü, içinde üç görünüm.
  if (izinler.anketIzni) {
    gunluk.push({
      href: "/admin/geri-bildirimler",
      label: "Geri bildirimler",
      ikon: "mesaj",
      altLinkler: [
        { href: "/admin/geri-bildirimler", label: "Liste" },
        { href: "/admin/kirilim", label: "Vardiya & masa" },
        { href: "/admin/urunler", label: "Ürünler" },
      ],
    });
  }

  const yonetim: NavLink[] = [];
  if (izinler.menuIzni) {
    yonetim.push(
      {
        href: "/admin/menu",
        label: "QR Menü",
        ikon: "menu",
        altLinkler: [
          { href: "/admin/menu", label: "Menümü düzenle", exact: true },
          { href: "/admin/menu/sablonlar", label: "Hazır şablonlar" },
          { href: "/admin/menu/onizle", label: "Menü görünümüm" },
          // Kodları üretip bastırmak QR menünün doğal devamı; işletme
          // ayarlarının altında aranıyordu.
          ...(tekIsletmeId
            ? [
                {
                  href: `/admin/isletmeler/${tekIsletmeId}/qr`,
                  label: "QR kodlarını yazdır",
                },
              ]
            : []),
        ],
      },
      { href: "/admin/duyurular", label: "Duyurular", ikon: "duyuru" },
    );
  }
  if (yonetici(role)) {
    yonetim.push(
      {
        href: "/admin/isletmeler",
        label: "İşletmeler",
        ikon: "bina",
        // Birden fazla işletmesi olan hesapta "Düzenle" tek bir hedefe
        // gidemez — o zaman listeden seçilir, alt link eklenmez.
        // Masa/QR yönetimi en sık dokunulan ekran ama önce işletmeyi bulup
        // sonra sayfa içinde aramak gerekiyordu; tek işletmeli hesapta
        // doğrudan menüden erişilebilir.
        ...(tekIsletmeId
          ? {
              altLinkler: [
                { href: "/admin/isletmeler", label: "Listele", exact: true },
                { href: `/admin/isletmeler/${tekIsletmeId}`, label: "Ayarlar", exact: true },
                {
                  href: `/admin/isletmeler/${tekIsletmeId}/masalar`,
                  label: "Masalar & QR",
                },
              ],
            }
          : {}),
      },
      {
        href: "/admin/kullanicilar",
        label: "Kullanıcılar",
        ikon: "kisi",
        altLinkler: [
          { href: "/admin/kullanicilar", label: "Listele", exact: true },
          { href: "/admin/kullanicilar/ekle", label: "Ekle" },
        ],
      },
      { href: "/admin/izinler", label: "Pazarlama izinleri", ikon: "izin" },
      { href: "/admin/entegrasyonlar", label: "Entegrasyonlar", ikon: "entegrasyon" },
      { href: "/admin/denetim", label: "İşlem geçmişi", ikon: "denetim" },
    );
  } else if (role === "manager" && tekIsletmeId) {
    // İşletme sorumlusunun tek işletmesi var; "İşletmeler" (çoğul, liste)
    // ona hiç görünmüyordu ve ayarlarına ulaşmanın tek yolu Profil sayfasına
    // gömülü, kopya bir formdu. O kopya kaldırıldı — gerçek modül burada:
    // owner'ın kullandığı dört sekmeli ekranın (Ayarlar / Anket kategorileri
    // / Masalar & QR / QR yazdır) aynısı, sadece "Listele" adımı atlanıyor.
    yonetim.push({
      href: `/admin/isletmeler/${tekIsletmeId}`,
      label: "İşletme ayarları",
      ikon: "bina",
      altLinkler: [
        { href: `/admin/isletmeler/${tekIsletmeId}`, label: "Ayarlar", exact: true },
        {
          href: `/admin/isletmeler/${tekIsletmeId}/kategoriler`,
          label: "Anket kategorileri",
        },
        {
          href: `/admin/isletmeler/${tekIsletmeId}/masalar`,
          label: "Masalar & QR noktaları",
        },
      ],
    });
  }

  // Vardiya çizelgesi ve görev şablonu yalnızca planlayan tarafta (yazma
  // yetkisi olan owner/bölge/manager); garson zaten "personel" moduna
  // düşüyor, viewer salt okunur olduğu için buraya girmiyor.
  const personel: NavLink[] = [];
  if (role === "owner" || role === "bolge" || role === "manager" || role === "superadmin") {
    personel.push({
      href: "/admin/vardiya-planlama",
      label: "Personel operasyonu",
      ikon: "takvim",
      altLinkler: [
        { href: "/admin/vardiya-planlama", label: "Çizelge", exact: true },
        { href: "/admin/vardiya-planlama/sablon", label: "Görev şablonu" },
      ],
    });
  }

  // "Hesabım/Profil" grubu yok: profile kenar çubuğunun altındaki kullanıcı
  // kartından gidiliyor. Tek satırlık bir grup, menüyü uzatmaktan başka işe
  // yaramıyordu.
  return [
    { baslik: "Günlük", linkler: gunluk },
    { baslik: "Personel", linkler: personel },
    { baslik: "Yönetim", linkler: yonetim },
    // Her iki modül izni de kapalı bir personel için "Yönetim" boş kalabilir;
    // boş başlık göstermenin anlamı yok.
  ].filter((grup) => grup.linkler.length > 0);
}

/** Adres çubuğundaki yola göre hangi bağlantının aktif olduğunu bulur. */
export function aktifMi(link: NavLink | AltNavLink, pathname: string): boolean {
  return link.exact ? pathname === link.href : pathname.startsWith(link.href);
}

/** Bir üst menünün alt linklerinden biri aktifse üst de "açık/aktif" sayılır. */
export function grupAktifMi(link: NavLink, pathname: string): boolean {
  if (!link.altLinkler) return aktifMi(link, pathname);
  return link.altLinkler.some((alt) => aktifMi(alt, pathname));
}
