import { describe, expect, it } from "vitest";
import { acilabilirRoller, aktifMi, panelMenusu, panelModu } from "./panel";

/** Menüdeki tüm bağlantı adreslerini düz listeye indirger. */
function adresler(modu: Parameters<typeof panelMenusu>[0], role: Parameters<typeof panelMenusu>[1]) {
  return panelMenusu(modu, role).flatMap((g) =>
    g.linkler.flatMap((l) => [l.href, ...(l.altLinkler?.map((alt) => alt.href) ?? [])]),
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
    for (const role of ["owner", "bolge", "manager", "viewer"] as const) {
      expect(panelModu(role, false)).toBe("kiraci");
    }
  });
});

describe("platform menüsü", () => {
  const platform = adresler("platform", "superadmin");

  it("kiracıya ait ekranları hiç göstermez", () => {
    // Platform yöneticisi hiçbir işletmenin sahibi değil; "kimin özeti"
    // sorusunun cevabı olmayan ekranlar menüde durmamalı.
    for (const gizli of [
      "/admin",
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
    expect(platform).toEqual([
      "/admin/hesaplar",
      "/admin/abonelikler",
      "/admin/isletmeler",
      "/admin/kullanicilar",
      "/admin/kullanicilar",
      "/admin/kullanicilar/ekle",
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

  it("salt okunur kullanıcı da yönetim ekranlarını görmez", () => {
    const viewer = adresler("kiraci", "viewer");
    expect(viewer).toContain("/admin/urunler");
    expect(viewer).not.toContain("/admin/kullanicilar");
  });

  it("tek işletmeli sorumlu kendi işletme ayarlarına sidebar'dan ulaşır", () => {
    // Önceden bu ekranlara ulaşmanın tek yolu Profil sayfasına gömülü,
    // kopya bir formdu — sidebar'da hiç bağlantı yoktu. Profil sadeleşince
    // gerçek modüle (owner'ın kullandığı aynı dört sekme) bir yol kalmalı.
    const manager = panelMenusu(
      "kiraci",
      "manager",
      { menuIzni: true, anketIzni: true },
      "isletme-1",
    ).flatMap((g) =>
      g.linkler.flatMap((l) => [l.href, ...(l.altLinkler?.map((alt) => alt.href) ?? [])]),
    );
    expect(manager).toContain("/admin/isletmeler/isletme-1");
    expect(manager).toContain("/admin/isletmeler/isletme-1/kategoriler");
    expect(manager).toContain("/admin/isletmeler/isletme-1/masalar");
    // Sahibe özel ekranlar hâlâ görünmüyor; yalnızca kendi işletmesine
    // erişim eklendi, hesap yönetimine değil.
    expect(manager).not.toContain("/admin/kullanicilar");
    expect(manager).not.toContain("/admin/izinler");
    expect(manager).not.toContain("/admin/isletmeler");
  });

  it("platform yöneticisi hesaba girince kiracı ekranlarını görür", () => {
    const iceriden = adresler("kiraci", "superadmin");
    expect(iceriden).toContain("/admin");
    expect(iceriden).toContain("/admin/izinler");
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
    expect(owner).toEqual(["bolge", "manager", "viewer", "garson"]);
  });

  it("platform yöneticisi sahip açabilir", () => {
    expect(acilabilirRoller("superadmin")).toContain("owner");
  });

  it("sorumlu ve salt okunur hiç kullanıcı açamaz", () => {
    expect(acilabilirRoller("manager")).toEqual([]);
    expect(acilabilirRoller("viewer")).toEqual([]);
    expect(acilabilirRoller("bolge")).toEqual([]);
  });
});
