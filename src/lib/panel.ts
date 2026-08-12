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
 *
 * Menü ile sayfa korumaları aynı kaynaktan beslenmeli: burada görünen her
 * bağlantının arkasında o rolü kabul eden bir `require*` kapısı var.
 */
export type PanelModu = "platform" | "kiraci";

export function panelModu(role: Role, aktifHesapVar: boolean): PanelModu {
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
  | "denetim"
  | "sistem"
  | "profil";

export type NavLink = {
  href: string;
  label: string;
  ikon: IkonAdi;
  /** Yalnızca tam eşleşmede aktif sayılır (kök adres için). */
  exact?: boolean;
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
  if (actorRole === "superadmin") return ["owner", "bolge", "manager", "viewer"];
  if (actorRole === "owner") return ["bolge", "manager", "viewer"];
  return [];
}

export function panelMenusu(modu: PanelModu, role: Role): NavGrup[] {
  if (modu === "platform") {
    return [
      {
        baslik: "Platform",
        linkler: [
          { href: "/admin/hesaplar", label: "Hesaplar", ikon: "hesap" },
          { href: "/admin/isletmeler", label: "İşletmeler", ikon: "bina" },
          { href: "/admin/kullanicilar", label: "Kullanıcılar", ikon: "kisi" },
        ],
      },
      {
        baslik: "Denetim",
        linkler: [
          { href: "/admin/denetim", label: "Denetim kaydı", ikon: "denetim" },
          { href: "/admin/sistem", label: "Sistem sağlığı", ikon: "sistem" },
        ],
      },
      {
        baslik: "Hesabım",
        linkler: [{ href: "/admin/profil", label: "Profil", ikon: "profil" }],
      },
    ];
  }

  const gunluk: NavLink[] = [
    { href: "/admin", label: "Özet", ikon: "pano", exact: true },
    { href: "/admin/geri-bildirimler", label: "Geri bildirimler", ikon: "mesaj" },
  ];

  const analiz: NavLink[] = [
    { href: "/admin/kirilim", label: "Kırılım", ikon: "grafik" },
    { href: "/admin/urunler", label: "Ürünler", ikon: "yildiz" },
  ];
  if (yonetici(role)) {
    analiz.push({ href: "/admin/kiyaslama", label: "İşletme kıyaslama", ikon: "kiyas" });
  }

  const yonetim: NavLink[] = [{ href: "/admin/menu", label: "QR Menü", ikon: "menu" }];
  if (yonetici(role)) {
    yonetim.push(
      { href: "/admin/isletmeler", label: "İşletmeler", ikon: "bina" },
      { href: "/admin/kullanicilar", label: "Kullanıcılar", ikon: "kisi" },
      { href: "/admin/izinler", label: "İleti izinleri", ikon: "izin" },
      { href: "/admin/denetim", label: "Denetim kaydı", ikon: "denetim" },
    );
  }

  return [
    { baslik: "Günlük", linkler: gunluk },
    { baslik: "Analiz", linkler: analiz },
    { baslik: "Yönetim", linkler: yonetim },
    {
      baslik: "Hesabım",
      linkler: [{ href: "/admin/profil", label: "Profil", ikon: "profil" }],
    },
  ];
}

/** Adres çubuğundaki yola göre hangi bağlantının aktif olduğunu bulur. */
export function aktifMi(link: NavLink, pathname: string): boolean {
  return link.exact ? pathname === link.href : pathname.startsWith(link.href);
}
