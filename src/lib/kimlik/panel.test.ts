import { describe, expect, it } from "vitest";
import { acilabilirRoller, aktifMi, konumYolu, panelMenusu, panelModu } from "./panel";
import { MODUL_ANAHTARLARI } from "./moduller";

/** Menüdeki tüm bağlantı adreslerini düz listeye indirger. */
function adresler(
  modu: Parameters<typeof panelMenusu>[0],
  role: Parameters<typeof panelMenusu>[1],
  moduller?: Parameters<typeof panelMenusu>[2],
  tekIsletmeId?: Parameters<typeof panelMenusu>[3],
) {
  return panelMenusu(modu, role, moduller, tekIsletmeId).flatMap((g) =>
    g.linkler.flatMap((l) => [
      l.href,
      ...(l.altLinkler?.map((alt) => alt.href) ?? []),
      // Sekmeyle gezilen sayfalar da menü ağacında (palet + konum yolu).
      ...(l.sayfalar?.map((s) => s.href) ?? []),
    ]),
  );
}

describe("panel modu", () => {
  it("platform yöneticisi hesap seçmediyse platform modundadır", () => {
    expect(panelModu("superadmin", false)).toBe("platform");
  });

  it("bir hesaba girdiğinde kiracı moduna geçer", () => {
    // Impersonation'ın anlamı bu: panel tam olarak o müşterinin gördüğü hale gelmeli.
    expect(panelModu("superadmin", true)).toBe("kiraci");
  });

  it("diğer roller her zaman kiracı modundadır", () => {
    for (const role of ["owner", "bolge", "manager"] as const) {
      expect(panelModu(role, false)).toBe("kiraci");
    }
  });
});

describe("platform menüsü", () => {
  const platform = adresler("platform", "superadmin");

  it("kiracıya ait ekranları hiç göstermez", () => {
    // Platform yöneticisi hiçbir işletmenin sahibi değil; "kimin özeti"
    // sorusunun cevabı olmayan ekranlar menüde durmamalı.
    // "/admin" artık listede değil: platform modunda o adres kiracı özeti
    // değil PLATFORM özeti (bkz. admin/(panel)/PlatformOzeti.tsx).
    for (const gizli of [
      "/admin/geri-bildirimler",
      "/admin/kirilim",
      "/admin/urunler",
      "/admin/menu",
      "/admin/izinler",
      "/admin/kiyaslama",
    ]) {
      expect(platform).not.toContain(gizli);
    }
  });

  it("platform işlerini gösterir", () => {
    // Kullanıcılar tek bağlantı: "Listele / Ekle" alt menüsü, sayfadaki
    // "+ Yeni kullanıcı" düğmesinin tekrarıydı (UI incelemesi, Ekim 2026).
    expect(platform).toEqual([
      "/admin",
      "/admin/hesaplar",
      "/admin/abonelikler",
      "/admin/isletmeler",
      "/admin/kullanicilar",
      "/admin/rotalar",
      "/admin/sponsorlar",
      "/admin/plus",
      "/admin/denetim",
      "/admin/sistem",
    ]);
  });
});

describe("kiracı menüsü", () => {
  it("hesap sahibi yönetim ekranlarını görür", () => {
    const owner = adresler("kiraci", "owner");
    expect(owner).toContain("/admin");
    expect(owner).toContain("/admin/izinler");
    expect(owner).toContain("/admin/kullanicilar");
  });

  it("işletme sorumlusu yönetim ekranlarını görmez", () => {
    // Bu ekranların arkasındaki requireOwner zaten manager'ı geri çeviriyor;
    // menüde göstermek onu kapalı bir kapıya yollamak olurdu.
    const manager = adresler("kiraci", "manager");
    expect(manager).toContain("/admin/geri-bildirimler");
    expect(manager).not.toContain("/admin/kullanicilar");
    expect(manager).not.toContain("/admin/izinler");
    expect(manager).not.toContain("/admin/kiyaslama");
  });

  it("bölge müdürü kendi işletmelerine giden bir bağlantı görür", () => {
    // Önceden "yonetici" (owner/superadmin) da değil, tek işletmeli bir
    // "manager" da değilse (bölge müdürü ikisi de değil) menüde HİÇ
    // işletme bağlantısı yoktu — sayfa (visibleBusinesses ile) doğru
    // çalışıyordu ama sidebar'dan keşfedilemiyordu.
    const tekIsletmeli = adresler("kiraci", "bolge", undefined, "isletme-1");
    expect(tekIsletmeli).toContain("/admin/isletmeler");

    const cokIsletmeli = adresler("kiraci", "bolge");
    expect(cokIsletmeli).toContain("/admin/isletmeler");
  });

  it("kapalı modülün menüde hiç bağlantısı olmaz", () => {
    // Menü ile sayfa kapıları aynı kaynaktan beslenmeli: burada görünmeyen
    // her adresin arkasında requireModul var (bkz. lib/auth.ts). Bu test o
    // eşleşmenin menü tarafını tutuyor.
    const hicbiri = panelMenusu("kiraci", "owner", []).flatMap((g) =>
      g.linkler.flatMap((l) => [l.href, ...(l.altLinkler?.map((a) => a.href) ?? [])]),
    );
    expect(hicbiri).not.toContain("/admin/menu");
    expect(hicbiri).not.toContain("/admin/geri-bildirimler");
    expect(hicbiri).not.toContain("/admin/izinler");
    expect(hicbiri).not.toContain("/admin/entegrasyonlar");
    expect(hicbiri).not.toContain("/admin/vardiya-planlama");
    expect(hicbiri).not.toContain("/admin/biyerlere");
    // Modülden bağımsız olanlar durmalı: hesap sahibi modülsüz kalsa bile
    // kullanıcılarını ve işletmesini yönetebilmeli.
    expect(hicbiri).toContain("/admin/kullanicilar");
  });

  it("kesfet modülü açıksa Biyerlere ayrı bir bağlantı olarak görünür", () => {
    // İşletme ayarları'nın altına gömülü değil — kendi adresi var (bkz.
    // app/admin/(panel)/biyerlere), o yüzden burada da ayrı test ediliyor.
    const sadeceKesfet = panelMenusu("kiraci", "owner", ["kesfet"]).flatMap((g) =>
      g.linkler.flatMap((l) => [l.href, ...(l.altLinkler?.map((a) => a.href) ?? [])]),
    );
    expect(sadeceKesfet).toContain("/admin/biyerlere");
  });

  it("yalnızca açık modül menüye girer", () => {
    const sadeceMenu = panelMenusu("kiraci", "owner", ["menu"]).flatMap((g) =>
      g.linkler.flatMap((l) => [l.href, ...(l.altLinkler?.map((a) => a.href) ?? [])]),
    );
    expect(sadeceMenu).toContain("/admin/menu");
    expect(sadeceMenu).not.toContain("/admin/geri-bildirimler");
    expect(sadeceMenu).not.toContain("/admin/vardiya-planlama");
  });

  it("tek işletmeli sorumlu kendi işletme ayarlarına sidebar'dan ulaşır", () => {
    // Önceden bu ekranlara ulaşmanın tek yolu Profil sayfasına gömülü,
    // kopya bir formdu — sidebar'da hiç bağlantı yoktu. Profil sadeleşince
    // gerçek modüle (owner'ın kullandığı aynı dört sekme) bir yol kalmalı.
    const manager = panelMenusu(
      "kiraci",
      "manager",
      MODUL_ANAHTARLARI,
      "isletme-1",
    ).flatMap((g) =>
      g.linkler.flatMap((l) => [
      l.href,
      ...(l.altLinkler?.map((alt) => alt.href) ?? []),
      // Sekmeyle gezilen sayfalar da menü ağacında (palet + konum yolu).
      ...(l.sayfalar?.map((s) => s.href) ?? []),
    ]),
    );
    expect(manager).toContain("/admin/isletmeler/isletme-1");
    expect(manager).toContain("/admin/isletmeler/isletme-1/kategoriler");
    expect(manager).toContain("/admin/isletmeler/isletme-1/masalar");
    // Kendi ekibini kurabilsin diye Kullanıcılar da eklendi (yalnızca
    // "garson" açabiliyor, bkz. acilabilirRoller ve userScopeFor testleri).
    // "Ekle" ayrı bir menü satırı değil; listedeki düğmeden açılıyor.
    expect(manager).toContain("/admin/kullanicilar");
    // Sahibe özel ekranlar hâlâ görünmüyor.
    expect(manager).not.toContain("/admin/izinler");
    expect(manager).not.toContain("/admin/isletmeler");
    expect(manager).not.toContain("/admin/entegrasyonlar");
    expect(manager).not.toContain("/admin/denetim");
  });

  it("platform yöneticisi hesaba girince kiracı ekranlarını görür", () => {
    const iceriden = adresler("kiraci", "superadmin");
    expect(iceriden).toContain("/admin");
    expect(iceriden).toContain("/admin/izinler");
  });
});

describe("personel performansı", () => {
  it("sahip ve yönetici görür, personelin kendi menüsünde hiç yok", () => {
    for (const role of ["owner", "bolge", "manager"] as const) {
      const adresler = panelMenusu("kiraci", role).flatMap((g) =>
        g.linkler.flatMap((l) => [
      l.href,
      ...(l.altLinkler?.map((alt) => alt.href) ?? []),
      // Sekmeyle gezilen sayfalar da menü ağacında (palet + konum yolu).
      ...(l.sayfalar?.map((s) => s.href) ?? []),
    ]),
      );
      expect(adresler).toContain("/admin/vardiya-planlama/performans");
    }

    // Garson zaten "kiraci" moduna hiç girmiyor — kendi menüsü tamamen ayrı
    // (Vardiyalarım/Görevlerim) ve performans linkini içermiyor.
    const personelMenusu = panelMenusu("personel", "garson").flatMap((g) =>
      g.linkler.flatMap((l) => [
      l.href,
      ...(l.altLinkler?.map((alt) => alt.href) ?? []),
      // Sekmeyle gezilen sayfalar da menü ağacında (palet + konum yolu).
      ...(l.sayfalar?.map((s) => s.href) ?? []),
    ]),
    );
    expect(personelMenusu).not.toContain("/admin/vardiya-planlama/performans");
    expect(personelMenusu).not.toContain("/admin/vardiya-planlama");
  });
});

describe("menü sadeliği", () => {
  it("kiracı menüsü üç grubu geçmez", () => {
    // Kafe sahibi günde bir bakıyor; uzun menü onu ilgilendiren iki ekranı
    // (özet, geri bildirim) gürültüye gömüyordu.
    expect(panelMenusu("kiraci", "owner").length).toBeLessThanOrEqual(3);
  });

  it("profil menüde değil ama kullanıcı kartından erişilebilir", () => {
    // Tek satırlık "Hesabım" grubu kaldırıldı; profil kenar çubuğunun
    // altındaki kullanıcı kartına taşındı (AdminSidebar).
    const owner = adresler("kiraci", "owner");
    expect(owner).not.toContain("/admin/profil");
  });

  it("başlıklarda teknik jargon kullanılmaz", () => {
    // "Kırılım", "İleti izinleri", "Denetim kaydı" kafe sahibine bir şey
    // anlatmıyordu; sade karşılıklarına çevrildi.
    const etiketler = panelMenusu("kiraci", "owner").flatMap((g) =>
      g.linkler.map((l) => l.label),
    );
    for (const jargon of ["Kırılım", "İleti izinleri", "Denetim kaydı"]) {
      expect(etiketler).not.toContain(jargon);
    }
  });
});

describe("aktif bağlantı", () => {
  const ozet = { href: "/admin", label: "Özet", ikon: "pano" as const, exact: true };
  const geri = { href: "/admin/geri-bildirimler", label: "Geri", ikon: "mesaj" as const };

  it("kök adres yalnızca tam eşleşmede aktiftir", () => {
    // exact olmasa "/admin" her sayfada aktif görünürdü.
    expect(aktifMi(ozet, "/admin")).toBe(true);
    expect(aktifMi(ozet, "/admin/urunler")).toBe(false);
  });

  it("alt sayfalar üst bağlantıyı aktif tutar", () => {
    expect(aktifMi(geri, "/admin/geri-bildirimler/abc")).toBe(true);
  });
});

describe("açılabilir roller", () => {
  it("hesap sahibi ikinci bir sahip açamaz", () => {
    // Sahiplik aboneliği ve faturayı taşır; müşterinin kendi hesabından
    // bizim göremediğimiz sahipler türemesin.
    const owner = acilabilirRoller("owner");
    expect(owner).not.toContain("owner");
    expect(owner).toEqual(["bolge", "manager", "garson"]);
  });

  it("platform yöneticisi sahip açabilir", () => {
    expect(acilabilirRoller("superadmin")).toContain("owner");
  });

  it("salt okunur hiç kullanıcı açamaz", () => {
    expect(acilabilirRoller("garson")).toEqual([]);
  });

  it("sorumlu ve bölge müdürü yalnızca garson açabilir", () => {
    // Günlük personel devrini kendileri çevirsinler diye — ama kendilerine
    // eş ya da üst bir rol açamazlar (bkz. userScopeFor: sorumlu ayrıca
    // kendi işletmesiyle sınırlı, hesaptaki başka işletmenin ekibine
    // karışamaz).
    expect(acilabilirRoller("manager")).toEqual(["garson"]);
    expect(acilabilirRoller("bolge")).toEqual(["garson"]);
  });
});

describe("konumYolu (üst çubuk)", () => {
  const platform = panelMenusu("platform", "superadmin");
  const kiraci = panelMenusu("kiraci", "owner", MODUL_ANAHTARLARI, "isl_1");
  const etiketler = (yol: ReturnType<typeof konumYolu>) => yol.map((a) => a.label);

  it("menüdeki sayfa: grup › sayfa", () => {
    expect(etiketler(konumYolu(platform, "/admin/hesaplar"))).toEqual(["Platform", "Hesaplar"]);
  });

  it("menüde olmayan alt sayfa adıyla eklenir", () => {
    expect(etiketler(konumYolu(platform, "/admin/kullanicilar/ekle"))).toEqual([
      "Platform",
      "Kullanıcılar",
      "Yeni",
    ]);
    expect(etiketler(konumYolu(platform, "/admin/kullanicilar/ckx1/duzenle"))).toEqual([
      "Platform",
      "Kullanıcılar",
      "Düzenle",
    ]);
  });

  it("ham kimlik başlığa basılmıyor, 'Detay' yazılıyor", () => {
    expect(etiketler(konumYolu(platform, "/admin/hesaplar/ckx9"))).toEqual([
      "Platform",
      "Hesaplar",
      "Detay",
    ]);
  });

  it("alt menüdeki sayfa üst başlığıyla görünür", () => {
    expect(etiketler(konumYolu(kiraci, "/admin/rezervasyon/plan"))).toEqual([
      "Yönetim",
      "Rezervasyon",
      "Kat planı",
    ]);
  });

  it("yalnızca son adım bağlantısız; önceki sayfa adımı tıklanabilir", () => {
    const yol = konumYolu(platform, "/admin/kullanicilar/ekle");
    expect(yol[1].href).toBe("/admin/kullanicilar");
    expect(yol[yol.length - 1].href).toBeUndefined();
  });

  it("özet (/admin) her adresle eşleşmiyor", () => {
    expect(etiketler(konumYolu(platform, "/admin"))).toEqual(["Platform", "Özet"]);
    expect(konumYolu(platform, "/admin/bilinmeyen")).toEqual([]);
  });
});

describe("çift navigasyon yok (UI incelemesi)", () => {
  const menu = panelMenusu("kiraci", "owner", MODUL_ANAHTARLARI, "isl_1");
  const linkler = menu.flatMap((g) => g.linkler);

  it("kenar çubuğunda açılır alt menü kalmadı — sekmeler sayfada", () => {
    expect(linkler.filter((l) => l.altLinkler?.length)).toEqual([]);
  });

  it("QR yazdırma QR Menü altında değil (İşletme ayarları sekmesi)", () => {
    const qrMenu = linkler.find((l) => l.href === "/admin/menu");
    expect(qrMenu?.sayfalar?.some((s) => s.href.endsWith("/qr"))).toBe(false);
  });

  it("sekmeyle açılan sayfada modül satırı aktif görünür", () => {
    const geriBildirim = linkler.find((l) => l.href === "/admin/geri-bildirimler")!;
    expect(aktifMi(geriBildirim, "/admin/kirilim")).toBe(true);
    expect(aktifMi(geriBildirim, "/admin/menu")).toBe(false);
  });

  it("konum yolu sekme sayfasını adıyla gösterir", () => {
    expect(konumYolu(menu, "/admin/vardiya-planlama/performans").map((a) => a.label)).toEqual([
      "Personel",
      "Personel operasyonu",
      "Performans",
    ]);
  });
});
