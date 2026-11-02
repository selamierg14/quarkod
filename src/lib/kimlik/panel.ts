import { gecerliRolMu, type Role } from "./session-token";
import { MODUL_ANAHTARLARI } from "./moduller";

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
  | "rezervasyon"
  | "pano"
  | "mesaj"
  | "grafik"
  | "sponsor"
  | "tac"
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
  | "duyuru"
  | "biyerlere"
  | "rota"
  | "telefon"
  | "saat";

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
  /**
   * Modülün sayfa İÇİ sekmelerle gezilen ekranları. Kenar çubuğunda
   * ÇİZİLMİYOR — yalnızca aktif satırı işaretlemek, konum yolunu kurmak ve
   * Ctrl+K aramasında bulunmak için.
   *
   * Önceden bunlar `altLinkler`'di: aynı ekranlar hem menüde alt öğe hem
   * sayfada sekme olarak iki kez duruyordu, "QR kodlarını yazdır" menüde
   * QR Menü altında ama sayfada İşletme ayarları sekmesi olarak açılıyordu
   * (UI incelemesi, "çift navigasyon"). Seçim sekmeden yana: bulunduğun
   * yerde kalıyor; menü yalnızca modüle giriş.
   */
  sayfalar?: AltNavLink[];
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
  if (actorRole === "superadmin") return ["owner", "bolge", "manager", "garson"];
  if (actorRole === "owner") return ["bolge", "manager", "garson"];
  // İşletme sorumlusu (tek işletmeye bağlı) ve bölge müdürü (birden fazla
  // işletmeye bağlı) günlük personel devrini kendileri çeviriyor — her yeni
  // garson için hesap sahibine gitmek zorunda kalmasınlar diye yalnızca
  // "garson" açabiliyorlar. Kendilerine eş ya da üst bir rol (manager,
  // bolge, owner) açamazlar.
  if (actorRole === "manager" || actorRole === "bolge") return ["garson"];
  return [];
}

/**
 * Var olan bir kullanıcı üzerinde işlem yapılabilir mi?
 *
 * GÜVENLİK KAPISI. Kullanıcı düzenleme, şifre sıfırlama ve pasife alma
 * eylemleri yalnızca `userScope` filtresine güveniyordu; o filtre ise bölge
 * müdürünü TÜM HESABA açıyordu. Sonuç, hesabın tamamen devralınmasına
 * kadar giden bir yetki yükseltmesiydi:
 *
 *   bölge müdürü → patronun şifresini sıfırla → patron olarak giriş yap
 *
 * "Açabildiğin rolü yönetebilirsin" kuralı bunu tek satırda kapatıyor:
 * bölge müdürü ve işletme sorumlusu yalnızca `garson` açabildiği için
 * yalnızca `garson` üzerinde işlem yapabilir. Patron kendi ekibini
 * (bolge/manager/garson) yönetir ama ikinci bir patrona dokunamaz;
 * sahiplik platform tarafının işi.
 *
 * Kapsam filtresi (userScope) yerine GEÇMİYOR, onunla birlikte çalışıyor:
 * biri "hangi kiracının kullanıcısı", diğeri "hangi kıdemdeki kullanıcı"
 * sorusunu cevaplıyor.
 */
export function yonetebilirMi(actorRole: Role, targetRole: string): boolean {
  if (!gecerliRolMu(targetRole)) return false;
  return acilabilirRoller(actorRole).includes(targetRole);
}



/**
 * Kullanıcılar tek bağlantı. Önceden "Listele / Ekle" alt menüsü vardı;
 * listenin kendisinde "+ Yeni kullanıcı" düğmesi olduğu için ikinci satır
 * yalnızca menüyü uzatıyordu. "Ekle" ekranındayken de aktif görünmesi
 * için `exact` yok — `/admin/kullanicilar/...` ile başlayan her adres bu
 * satırı işaretliyor.
 */
const KULLANICILAR: NavLink = {
  href: "/admin/kullanicilar",
  label: "Kullanıcılar",
  ikon: "kisi",
};

export function panelMenusu(
  modu: PanelModu,
  role: Role,
  moduller: readonly string[] = MODUL_ANAHTARLARI,
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
          // Platform özeti: önceden /admin iskeleti gösterip Hesaplar'a
          // yönlendiriyordu; yönetici "bugün neye bakmalıyım" ekranını
          // hiç görmüyordu (bkz. admin/(panel)/PlatformOzeti.tsx).
          { href: "/admin", label: "Özet", ikon: "pano", exact: true },
          { href: "/admin/hesaplar", label: "Hesaplar", ikon: "hesap" },
          { href: "/admin/abonelikler", label: "Abonelikler", ikon: "abonelik" },
          { href: "/admin/isletmeler", label: "İşletmeler", ikon: "bina" },
          KULLANICILAR,
        ],
      },
      {
        // Yalnızca "Biyerlere" yeni gelen biri için hiçbir şey
        // söylemiyordu; bu grup tüketici uygulamasının içeriği.
        baslik: "Biyerlere uygulaması",
        linkler: [
          { href: "/admin/rotalar", label: "Rotalar", ikon: "rota" },
          { href: "/admin/sponsorlar", label: "Sponsorlar ve kredi", ikon: "sponsor" },
          { href: "/admin/plus", label: "Biyerlere Plus", ikon: "tac" },
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
    /**
     * CEP MODU en üstte ve herkeste: salonda telefondan açılan tek ekran
     * (bkz. admin/(panel)/cep/page.tsx). Menünün dibinde dursaydı, tam da
     * kullanılacağı anda — ayaktayken, tek elle — bulunamazdı.
     */
    { href: "/admin/cep", label: "Cep modu", ikon: "telefon", exact: true },
  ];
  // Geri bildirimler ve QR Menü modül bazlı kısıtlanabilir; sahip/platform
  // yöneticisi her zaman görür (izinler zaten getSession'da true'ya sabitlenir).
  //
  // Vardiya & masa ve Ürün puanları eskiden ayrı üst düzey sekmelerdi; aynı
  // geri bildirim verisinin farklı kesitleri olduğu için tek başlık altında
  // toplandı — beş dağınık rapor sekmesi yerine tek bir "Geri bildirimler"
  // modülü, içinde üç görünüm.
  if (moduller.includes("anket")) {
    gunluk.push({
      href: "/admin/geri-bildirimler",
      label: "Geri bildirimler",
      ikon: "mesaj",
      sayfalar: [
        { href: "/admin/geri-bildirimler", label: "Liste" },
        { href: "/admin/kirilim", label: "Vardiya & masa" },
        { href: "/admin/urunler", label: "Ürünler" },
      ],
    });
  }

  const yonetim: NavLink[] = [];
  if (moduller.includes("menu")) {
    yonetim.push(
      {
        href: "/admin/menu",
        label: "QR Menü",
        ikon: "menu",
        sayfalar: [
          { href: "/admin/menu", label: "Menümü düzenle", exact: true },
          { href: "/admin/menu/sablonlar", label: "Hazır şablonlar" },
          { href: "/admin/menu/onizle", label: "Menü görünümüm" },
        ],
      },
      { href: "/admin/duyurular", label: "Duyurular", ikon: "duyuru" },
    );
  }
  // Biyerlere (B2C keşfet uygulaması) kendi ayrı ayar sayfası: konum,
  // mekan özellikleri, Plus ortaklığı ve flaş indirim — İşletme
  // ayarları'nın altına gömülü DEĞİL, ayrı bir modül olarak duruyor
  // (bkz. app/admin/(panel)/biyerlere).
  if (moduller.includes("kesfet")) {
    yonetim.push({ href: "/admin/biyerlere", label: "Biyerlere", ikon: "biyerlere" });
  }
  // Rezervasyon: kat planı + saatli kayıt. "Günlük" grubunda değil
  // yönetimde, çünkü kat planını kurmak bir kereye mahsus bir ayar işi;
  // günlük kullanım (masa durumu) o sayfanın kendi sekmesinde.
  if (moduller.includes("rezervasyon")) {
    yonetim.push({
      href: "/admin/rezervasyon",
      label: "Rezervasyon",
      ikon: "rezervasyon",
      sayfalar: [
        { href: "/admin/rezervasyon", label: "Masa durumu", exact: true },
        { href: "/admin/rezervasyon/plan", label: "Kat planı" },
      ],
    });
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
              sayfalar: [
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
      KULLANICILAR,
      { href: "/admin/denetim", label: "İşlem geçmişi", ikon: "denetim" },
    );
    // Pazarlama ve İYS ayrı satılan modüller: izni olmayan hesapta menüde
    // hiç görünmüyor (sayfa kapısı requireModul ile ayrıca korunuyor).
    if (moduller.includes("pazarlama")) {
      yonetim.splice(yonetim.length - 1, 0, {
        href: "/admin/izinler",
        label: "Pazarlama izinleri",
        ikon: "izin",
      });
    }
    if (moduller.includes("iys")) {
      yonetim.splice(yonetim.length - 1, 0, {
        href: "/admin/entegrasyonlar",
        label: "Entegrasyonlar",
        ikon: "entegrasyon",
      });
    }
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
      sayfalar: [
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
    // Günlük personel devrini (yeni garson, şifre sıfırlama) sorumlunun
    // kendisi çevirebilsin diye — önceden bu ekrana hiç bağlantı yoktu,
    // yalnızca sahibin açabildiği bir kapıydı (requireOwner). Kapı artık
    // requirePersonelYonetimi; acilabilirRoller de sorumluya yalnızca
    // "garson" açtırıyor, userScope ise onu kendi işletmesiyle sınırlıyor
    // — hesaptaki başka bir işletmenin ekibini göremez/düzenleyemez.
    yonetim.push(KULLANICILAR);
  } else if (role === "bolge") {
    // Bölge müdürü ne "yonetici" (owner/superadmin) ne tek işletmeli bir
    // "manager" — birden fazla işletmeye bağlı olduğu için manager'daki
    // gibi TEK bir ayar sayfasına kısayol veremeyiz. Önceden bu role için
    // burada HİÇ link yoktu: sayfa (/admin/isletmeler) visibleBusinesses
    // ile zaten doğru kısıtlanıyordu ama menüden bulunamıyordu — bölge
    // müdürü kendi işletmelerine giden bir yolu keşfedemiyordu.
    yonetim.push({ href: "/admin/isletmeler", label: "İşletmelerim", ikon: "bina" });
    yonetim.push(KULLANICILAR);
  }

  // Vardiya çizelgesi ve görev şablonu yalnızca planlayan tarafta (garson
  // zaten "personel" moduna düşüyor) ve yalnızca modül açıksa.
  const personel: NavLink[] = [];
  if (moduller.includes("personel") && role !== "garson") {
    personel.push({
      href: "/admin/vardiya-planlama",
      label: "Personel operasyonu",
      ikon: "takvim",
      sayfalar: [
        { href: "/admin/vardiya-planlama", label: "Çizelge", exact: true },
        // "İzinler" adı panelde ticari ileti onaylarına ait (MarketingConsent);
        // personel izni tamamen ayrı bir kavram olduğu için burada vardiya
        // modülünün altında ve farklı bir adla duruyor.
        { href: "/admin/vardiya-planlama/izinler", label: "İzin & müsaitlik" },
        { href: "/admin/vardiya-planlama/sablon", label: "Görev şablonu" },
        // Personelin kendisi bu gruba hiç girmiyor (garson "personel"
        // moduna düşüyor) — performans kartı yalnızca planlayan tarafa görünür.
        { href: "/admin/vardiya-planlama/performans", label: "Performans" },
      ],
    });
  }

  /**
   * MESAİ TAKİBİ ayrı bir modül: vardiya planlayan her işletme giriş/çıkış
   * takibi istemiyor (ve tersi de doğru — plan yapmadan yalnızca saat
   * tutan yerler var).
   *
   * Garsona GÖSTERİLMİYOR: personelin buradaki işi karekodu okutmak ve o
   * ekrana menüden değil QR'dan geliniyor. Kendi kayıtlarını okutma
   * ekranının altında görüyor.
   */
  if (moduller.includes("mesai") && role !== "garson") {
    personel.push({
      href: "/admin/mesai",
      label: "Mesai takibi",
      ikon: "saat",
      exact: true,
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
  const kendisi = link.exact ? pathname === link.href : pathname.startsWith(link.href);
  if (kendisi) return true;
  // Sekmeyle gezilen sayfalardan biri açıksa modül satırı da aktif
  // (ör. /admin/kirilim açıkken "Geri bildirimler").
  return "sayfalar" in link && Boolean(link.sayfalar?.some((s) => aktifMi(s, pathname)));
}

/** Bir üst menünün alt linklerinden biri aktifse üst de "açık/aktif" sayılır. */
export function grupAktifMi(link: NavLink, pathname: string): boolean {
  if (!link.altLinkler) return aktifMi(link, pathname);
  return link.altLinkler.some((alt) => aktifMi(alt, pathname));
}

// --- Konum yolu (breadcrumb) -----------------------------------------

export type KonumAdimi = { label: string; href?: string };

/**
 * Menüde karşılığı olmayan alt sayfaların adları. Liste sayfaları menüde;
 * onların altındaki "ekle/düzenle/detay" ekranları değil.
 */
const ALT_SAYFA_ADI: Record<string, string> = {
  ekle: "Yeni",
  duzenle: "Düzenle",
  masalar: "Masalar & QR",
  kategoriler: "Anket kategorileri",
  qr: "QR kodları",
  plan: "Kat planı",
  sablonlar: "Hazır şablonlar",
  onizle: "Önizleme",
  izinler: "İzin & müsaitlik",
  sablon: "Görev şablonu",
  performans: "Performans",
};

function eslesir(href: string, pathname: string, exact?: boolean): boolean {
  if (exact || href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Üst çubuktaki konum yolu: "Platform › Kullanıcılar › Yeni".
 *
 * Menü ağacından türüyor — ayrı bir harita tutulmuyor, yeni bir ekran
 * menüye eklendiğinde yolu da kendiliğinden doğru çıkıyor. En uzun
 * eşleşen bağlantı seçiliyor ki `/admin/rezervasyon/plan` "Rezervasyon"
 * değil "Kat planı" altında görünsün.
 *
 * Menüde olmayan alt sayfa (ör. /admin/kullanicilar/ekle) son adım olarak
 * ekleniyor; adı bilinmeyen bir kimlik parçası ("/hesaplar/ckx…") için
 * "Detay" yazılıyor — ham kimliği başlığa basmak anlamsız olurdu.
 */
export function konumYolu(gruplar: NavGrup[], pathname: string): KonumAdimi[] {
  type Aday = { grup: string; ust?: NavLink; label: string; href: string; exact?: boolean };
  const adaylar: Aday[] = [];
  for (const grup of gruplar) {
    for (const link of grup.linkler) {
      adaylar.push({ grup: grup.baslik, label: link.label, href: link.href, exact: link.exact });
      for (const alt of [...(link.altLinkler ?? []), ...(link.sayfalar ?? [])]) {
        adaylar.push({ grup: grup.baslik, ust: link, label: alt.label, href: alt.href, exact: alt.exact });
      }
    }
  }

  const bulunan = adaylar
    .filter((a) => eslesir(a.href, pathname, a.exact))
    .sort((a, b) => b.href.length - a.href.length || Number(Boolean(b.ust)) - Number(Boolean(a.ust)))[0];

  // Menüde olmayan bir alt sayfa ise, ona en yakın menü bağlantısını
  // (exact olsa bile) üst olarak kullan.
  const ebeveyn =
    bulunan ??
    adaylar
      .filter((a) => a.href !== "/admin" && pathname.startsWith(`${a.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0];
  if (!ebeveyn) return [];

  const yol: KonumAdimi[] = [{ label: ebeveyn.grup }];
  if (ebeveyn.ust && ebeveyn.ust.label !== ebeveyn.label) {
    yol.push({ label: ebeveyn.ust.label });
  }
  yol.push({ label: ebeveyn.label, href: ebeveyn.href });

  if (pathname !== ebeveyn.href) {
    const kalan = pathname.slice(ebeveyn.href.length).split("/").filter(Boolean);
    const son = kalan[kalan.length - 1];
    if (son) yol.push({ label: ALT_SAYFA_ADI[son] ?? "Detay" });
  }

  // Son adım içinde bulunulan sayfa: bağlantı değil.
  const sonAdim = yol[yol.length - 1];
  yol[yol.length - 1] = { label: sonAdim.label };
  return yol;
}
