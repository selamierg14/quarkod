import { describe, expect, it } from "vitest";
import {
  MEKAN_OZELLIK_ANAHTARLARI,
  gecerliKoordinatMi,
  gecerliSegmentMi,
  googleLinkindenKoordinat,
  koordinatCoz,
  mesafeMetre,
  ozellikleriCoz,
  ozellikleriYaz,
} from "./mekan";

/**
 * Mekan konumu ve özellikleri.
 *
 * Buradaki bir kırmızının iki ayrı sonucu olabilir: müşteri haritada
 * yanlış sokağa yönlendirilir, ya da (mesafe hesabı sahte yorum engelinde
 * kullanıldığında) gerçek müşteri puan veremez / evinden puan verilebilir.
 */
describe("google bağlantısından koordinat", () => {
  // Panelde kayıtlı gerçek bir bağlantı biçimi.
  const gercekLink =
    "https://www.google.com/maps/place/KESK%C4%B0N+LEZZETLER/@40.8715146,29.2303632,17z/" +
    "data=!3m1!4b1!4m6!3m5!1s0x14cadd32245402bf:0xf1439609d1e5d7ec!8m2!3d40.8715146!4d29.2329381";

  it("işletmenin kendi konumunu (!3d/!4d) görüntü merkezine (@) tercih eder", () => {
    // @ ile gelen 29.2303632 haritanın o anki merkezi; !4d ile gelen
    // 29.2329381 işletmenin kendisi. İkisi ~220 m farklı.
    expect(googleLinkindenKoordinat(gercekLink)).toEqual({
      enlem: 40.8715146,
      boylam: 29.2329381,
    });
  });

  it("yalnızca @ varsa onu kullanır", () => {
    expect(
      googleLinkindenKoordinat("https://www.google.com/maps/@40.99,29.11,17z"),
    ).toEqual({ enlem: 40.99, boylam: 29.11 });
  });

  it("negatif koordinatları okur", () => {
    expect(
      googleLinkindenKoordinat("https://maps.google.com/@-33.8688,151.2093,15z"),
    ).toEqual({ enlem: -33.8688, boylam: 151.2093 });
  });

  it("koordinat taşımayan bağlantıda null döner", () => {
    // Yorum bırakma linki bir konum taşımıyor; uydurmaktansa boş bırakmak
    // doğru — yanlış koordinat müşteriyi yanlış yere yollar.
    expect(
      googleLinkindenKoordinat(
        "https://search.google.com/local/writereview?placeid=DEGISTIRIN",
      ),
    ).toBeNull();
    expect(googleLinkindenKoordinat(null)).toBeNull();
    expect(googleLinkindenKoordinat("")).toBeNull();
  });

  it("sınır dışı değerleri reddeder", () => {
    expect(googleLinkindenKoordinat("https://x/@999,29.2,17z")).toBeNull();
  });
});

describe("koordinat doğrulama", () => {
  it("geçerli aralığı kabul eder", () => {
    expect(gecerliKoordinatMi(40.87, 29.23)).toBe(true);
    expect(gecerliKoordinatMi(-90, 180)).toBe(true);
  });

  it("aralık dışını reddeder", () => {
    expect(gecerliKoordinatMi(91, 0)).toBe(false);
    expect(gecerliKoordinatMi(0, 181)).toBe(false);
    expect(gecerliKoordinatMi(NaN, 29)).toBe(false);
  });

  it("(0,0) reddedilir", () => {
    // Gine Körfezi gerçek bir nokta ama pratikte hep "boş alan" demek.
    expect(gecerliKoordinatMi(0, 0)).toBe(false);
  });
});

describe("form girdisinden koordinat", () => {
  it("ikisi de boşsa null (girilmedi)", () => {
    expect(koordinatCoz("", "")).toBeNull();
    expect(koordinatCoz("  ", " ")).toBeNull();
  });

  it("tek başına enlem hata (undefined)", () => {
    // null ile undefined ayrımı önemli: null "boş bırakıldı", undefined
    // "girildi ama okunamadı" — ikincisinde form hata göstermeli.
    expect(koordinatCoz("40.87", "")).toBeUndefined();
    expect(koordinatCoz("", "29.23")).toBeUndefined();
  });

  it("virgüllü ondalığı kabul eder", () => {
    expect(koordinatCoz("40,8715", "29,2329")).toEqual({
      enlem: 40.8715,
      boylam: 29.2329,
    });
  });

  it("anlamsız değeri reddeder", () => {
    expect(koordinatCoz("abc", "29.23")).toBeUndefined();
    expect(koordinatCoz("999", "29.23")).toBeUndefined();
  });
});

describe("mesafe", () => {
  it("aynı nokta sıfır", () => {
    const p = { enlem: 40.8715, boylam: 29.2329 };
    expect(mesafeMetre(p, p)).toBe(0);
  });

  it("bilinen bir mesafeyi makul hesaplar", () => {
    // 0.001 derece enlem ≈ 111 m.
    const mesafe = mesafeMetre(
      { enlem: 40.8715, boylam: 29.2329 },
      { enlem: 40.8725, boylam: 29.2329 },
    );
    expect(mesafe).toBeGreaterThan(105);
    expect(mesafe).toBeLessThan(118);
  });

  it("simetriktir", () => {
    const a = { enlem: 40.87, boylam: 29.23 };
    const b = { enlem: 41.01, boylam: 28.97 };
    expect(mesafeMetre(a, b)).toBe(mesafeMetre(b, a));
  });

  it("100 m eşiği anlamlı ayrım yapar", () => {
    // Sahte yorum engelinin dayanağı: mekandaki biri ile 1 km ötedeki biri.
    const mekan = { enlem: 40.8715, boylam: 29.2329 };
    const masada = { enlem: 40.8716, boylam: 29.233 };
    const uzakta = { enlem: 40.8805, boylam: 29.2329 };

    expect(mesafeMetre(mekan, masada)).toBeLessThan(100);
    expect(mesafeMetre(mekan, uzakta)).toBeGreaterThan(100);
  });
});

describe("mekan özellikleri", () => {
  it("tanınmayan anahtarı atar", () => {
    expect(ozellikleriCoz("priz,uydurma,bahce")).toEqual(["priz", "bahce"]);
  });

  it("tekrarı teke indirir", () => {
    expect(ozellikleriCoz("priz,priz")).toEqual(["priz"]);
  });

  it("boş girdi boş liste", () => {
    expect(ozellikleriCoz(null)).toEqual([]);
    expect(ozellikleriCoz("")).toEqual([]);
  });

  it("yazılan değer geri okunabiliyor", () => {
    const ham = ozellikleriYaz(["wifi", "priz", "uydurma"]);
    expect(ozellikleriCoz(ham)).toEqual(["wifi", "priz"]);
  });

  it("hiç geçerli özellik yoksa null saklanır", () => {
    expect(ozellikleriYaz(["uydurma"])).toBeNull();
    expect(ozellikleriYaz([])).toBeNull();
  });

  it("bütün tanımlı anahtarlar geçerli sayılır", () => {
    expect(ozellikleriCoz(MEKAN_OZELLIK_ANAHTARLARI.join(","))).toHaveLength(
      MEKAN_OZELLIK_ANAHTARLARI.length,
    );
  });
});

describe("fiyat segmenti", () => {
  it("tanımlı segmentleri kabul eder", () => {
    expect(gecerliSegmentMi("ucuz")).toBe(true);
    expect(gecerliSegmentMi("pahali")).toBe(true);
  });

  it("uydurma segmenti reddeder", () => {
    expect(gecerliSegmentMi("bedava")).toBe(false);
    expect(gecerliSegmentMi("")).toBe(false);
  });
});
