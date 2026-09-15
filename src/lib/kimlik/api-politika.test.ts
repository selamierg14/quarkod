import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { API_POLITIKALARI, apiKarari, politikaBul } from "./api-politika";

/**
 * Tüketici API'sinin kapı testleri.
 *
 * Buradaki iddia şu: hiçbir uç, politika tablosuna yazılmadan ve doğru
 * erişim sınıfına konmadan yayına çıkamaz. Tablo ile diskteki gerçek
 * route dosyaları KARŞILAŞTIRILIYOR — yeni bir uç eklenip tabloya
 * yazılmazsa test kırmızıya döner.
 */

const API_KOKU = join(process.cwd(), "src/app/api/app");

/** Diskteki route.ts dosyalarından uç yollarını çıkarır. */
function diskteEkiUclar(kok: string, onek = ""): string[] {
  const sonuc: string[] = [];
  for (const ad of readdirSync(kok)) {
    const tam = join(kok, ad);
    if (statSync(tam).isDirectory()) {
      sonuc.push(...diskteEkiUclar(tam, `${onek}/${ad}`));
    } else if (ad === "route.ts") {
      sonuc.push(onek || "/");
    }
  }
  return sonuc;
}

describe("politika tablosu diskle uyumlu", () => {
  it("her route.ts için bir politika satırı var", () => {
    for (const yol of diskteEkiUclar(API_KOKU)) {
      // Dinamik parça `[slug]` → tabloda "/mekanlar/" öneki karşılıyor.
      const aranan = yol.replace(/\/\[[^\]]+\]$/, "/");
      expect(
        API_POLITIKALARI[aranan],
        `${yol} için api-politika.ts'te satır yok — uç korumasız kalır`,
      ).toBeDefined();
    }
  });

  it("tabloda diskte olmayan uç yok", () => {
    const diskte = new Set(diskteEkiUclar(API_KOKU).map((y) => y.replace(/\/\[[^\]]+\]$/, "/")));
    for (const yol of Object.keys(API_POLITIKALARI)) {
      expect(diskte.has(yol), `${yol} tabloda var ama route.ts yok`).toBe(true);
    }
  });
});

describe("tablodaki metotlar route'un gerçekten yazdıklarıyla aynı", () => {
  /**
   * İki yön de sorunlu, ama farklı şekilde:
   *
   *   - Tabloda olup route'ta OLMAYAN metot: middleware isteği geçiriyor,
   *     Next 405 döndürüyor. Zararsız ama tablo yalan söylüyor — okuyan
   *     kişi olmayan bir ucun var olduğuna inanıyor.
   *   - Route'ta olup tabloda OLMAYAN metot: handler yazılmış ama ona hiç
   *     istek ulaşmıyor. Sessizce ölü kod; "neden çalışmıyor" diye
   *     saatler harcanan tür.
   *
   * İkisi de ancak elle fark edilebiliyordu. Artık edilmiyor.
   */
  const METOTLAR = ["GET", "POST", "PUT", "DELETE"] as const;

  function dosyadakiMetotlar(yol: string): string[] {
    const klasor = yol === "/" ? API_KOKU : join(API_KOKU, yol.slice(1));
    const kaynak = readFileSync(join(klasor, "route.ts"), "utf8");
    return METOTLAR.filter((m) =>
      new RegExp(`export\\s+async\\s+function\\s+${m}\\b`).test(kaynak),
    );
  }

  it("her uçta iki liste örtüşüyor", () => {
    for (const ham of diskteEkiUclar(API_KOKU)) {
      const anahtar = ham.replace(/\/\[[^\]]+\]$/, "/");
      const politika = API_POLITIKALARI[anahtar];
      if (!politika) continue; // Üstteki test zaten kırmızıya döner.
      expect([...politika.metotlar].sort(), anahtar).toEqual(dosyadakiMetotlar(ham).sort());
    }
  });
});

describe("kimlik kapısı — route'a gelmeden", () => {
  const jetonluUclar = Object.entries(API_POLITIKALARI)
    .filter(([, p]) => p.erisim === "jetonlu")
    .map(([yol, p]) => [`/api/app${yol}`, p.metotlar[0]] as const);

  it("jetonsuz istek jetonlu uca ULAŞAMAZ", () => {
    for (const [yol, metot] of jetonluUclar) {
      expect(apiKarari(yol, metot, false), yol).toEqual({ sonuc: "kimlikYok" });
    }
  });

  it("jetonlu istek geçer", () => {
    for (const [yol, metot] of jetonluUclar) {
      expect(apiKarari(yol, metot, true).sonuc, yol).toBe("gecebilir");
    }
  });

  it("kişisel veri uçlarının hepsi jetonlu", () => {
    // Bu listedeki bir ucun yanlışlıkla "acik" olması doğrudan veri sızıntısı.
    for (const yol of ["/ben", "/profil", "/cuzdan", "/bildirimler", "/favoriler", "/konum", "/push"]) {
      expect(API_POLITIKALARI[yol]?.erisim, yol).toBe("jetonlu");
    }
  });

  it("değer üreten uçlar jetonlu", () => {
    // Puan, kupon ve Plus hakkı üreten uçlar anonim çağrılamamalı.
    for (const yol of ["/ziyaret", "/plus-talep"]) {
      expect(API_POLITIKALARI[yol]?.erisim, yol).toBe("jetonlu");
    }
  });
});

describe("metot kısıtı", () => {
  it("tanımsız metot 405 alır", () => {
    const karar = apiKarari("/api/app/mekanlar", "POST", false);
    expect(karar.sonuc).toBe("metotYok");
    if (karar.sonuc === "metotYok") expect(karar.izinliler).toEqual(["GET"]);
  });

  it("salt okunur uca yazma denemesi geçmez", () => {
    expect(apiKarari("/api/app/cuzdan", "DELETE", true).sonuc).toBe("metotYok");
    expect(apiKarari("/api/app/profil", "POST", true).sonuc).toBe("metotYok");
  });
});

describe("yol eşleştirme — sızıntıya kapalı", () => {
  it("tanınmayan uç 404", () => {
    expect(apiKarari("/api/app/gizli", "GET", true)).toEqual({ sonuc: "bulunamadi" });
    expect(apiKarari("/api/app/", "GET", true)).toEqual({ sonuc: "bulunamadi" });
  });

  it("dinamik olmayan uca alt yol eklenemez", () => {
    // "/ziyaret/x" politikasız olmalı; yoksa alt yollar sessizce
    // üst ucun politikasını devralırdı.
    expect(politikaBul("/api/app/ziyaret/fazladan")).toBeNull();
    expect(politikaBul("/api/app/cuzdan/baskasi")).toBeNull();
  });

  it("dinamik uç tek parça kabul eder", () => {
    expect(politikaBul("/api/app/mekanlar/ada-kahvesi")).not.toBeNull();
    // İki parçalı derin yol tanımlı değil.
    expect(politikaBul("/api/app/mekanlar/ada/menu")).toBeNull();
  });

  it("yol geçişi (path traversal) denemesi eşleşmez", () => {
    expect(politikaBul("/api/app/../admin/kullanicilar")).toBeNull();
    expect(politikaBul("/api/appx/mekanlar")).toBeNull();
  });

  it("önek dışındaki yollar bu tabloya girmez", () => {
    expect(politikaBul("/admin/kullanicilar")).toBeNull();
    expect(politikaBul("/api/kupon-dogrula")).toBeNull();
  });
});
