import { describe, expect, it } from "vitest";
import {
  GUVENILIR_OY_SINIRI,
  enIyiEnKotu,
  formatPrice,
  parsePrice,
  parseAlerjenler,
  parseKalori,
  parseOzelBilesenler,
  parseTags,
  serializeAlerjenler,
  serializeTags,
  urunPuanlari,
} from "./menu";

describe("fiyat", () => {
  it("Türkçe yazımı kuruşa çevirir", () => {
    expect(parsePrice("19,90")).toBe(1990);
    expect(parsePrice("149")).toBe(14900);
    expect(parsePrice("1.250,50")).toBe(125050);
    expect(parsePrice(" 85,00 ₺ ")).toBe(8500);
  });

  it("boş fiyatı kabul eder (fiyatsız ürün olabilir)", () => {
    expect(parsePrice("")).toBeNull();
    expect(parsePrice("   ")).toBeNull();
  });

  it("bozuk girdiyi reddeder", () => {
    // undefined = "geçersiz", null = "boş". İkisini karıştırmak, hatalı
    // girdiyi sessizce fiyatsız ürüne çevirirdi.
    expect(parsePrice("abc")).toBeUndefined();
    expect(parsePrice("-5")).toBeUndefined();
    expect(parsePrice("19,999")).toBeUndefined();
    expect(parsePrice("999999")).toBeUndefined();
  });

  it("kuruş üzerinden gösterir", () => {
    expect(formatPrice(1990)).toBe("₺19,90");
    expect(formatPrice(14900)).toBe("₺149,00");
    expect(formatPrice(null)).toBe("");
  });

  it("gidiş dönüşte değer kaymaz", () => {
    // Ondalıklı sayı kullanılsaydı burada kuruş sapmaları birikirdi.
    for (const yazi of ["0,01", "19,90", "1.234,56"]) {
      const kurus = parsePrice(yazi) as number;
      expect(formatPrice(kurus)).toBe(`₺${yazi}`);
    }
  });
});

describe("etiketler", () => {
  it("yalnızca bilinen etiketleri kabul eder", () => {
    expect(parseTags("vegan,glutensiz,uyduruk")).toEqual(["vegan", "glutensiz"]);
  });

  it("büyük harf ve boşluğa takılmaz", () => {
    expect(parseTags(" Vegan , ACI ")).toEqual(["vegan", "aci"]);
  });

  it("tekrarı teke indirir", () => {
    expect(serializeTags(["vegan", "vegan", "aci"])).toBe("vegan,aci");
  });

  it("etiket yoksa null saklar", () => {
    expect(serializeTags([])).toBeNull();
    expect(serializeTags(["uyduruk"])).toBeNull();
    expect(parseTags(null)).toEqual([]);
  });
});

describe("ürün puanları", () => {
  const puan = (itemName: string, rating: number, menuItemId: string | null = itemName) => ({
    menuItemId,
    itemName,
    rating,
  });

  it("ürün bazında ortalama ve oy sayısı hesaplar", () => {
    const sonuc = urunPuanlari([puan("Latte", 5), puan("Latte", 4), puan("Cheesecake", 2)]);
    expect(sonuc[0]).toMatchObject({ itemName: "Latte", ortalama: 4.5, oySayisi: 2 });
    expect(sonuc[1]).toMatchObject({ itemName: "Cheesecake", ortalama: 2, oySayisi: 1 });
  });

  it("silinmiş ürünün puanlarını adıyla toplar", () => {
    // menuItemId null'a düşse bile rapor "Latte" satırını tek parça göstermeli.
    const sonuc = urunPuanlari([puan("Latte", 5, null), puan("latte", 3, null)]);
    expect(sonuc).toHaveLength(1);
    expect(sonuc[0].oySayisi).toBe(2);
  });

  it("geçersiz puanı saymaz", () => {
    const sonuc = urunPuanlari([puan("Latte", 5), puan("Latte", 9), puan("Latte", 0)]);
    expect(sonuc[0].oySayisi).toBe(1);
  });

  it("az oylu ürünü işaretler", () => {
    const az = urunPuanlari([puan("Yeni Tatlı", 5)]);
    expect(az[0].azVeri).toBe(true);

    const cok = urunPuanlari(
      Array.from({ length: GUVENILIR_OY_SINIRI }, () => puan("Latte", 4)),
    );
    expect(cok[0].azVeri).toBe(false);
  });

  it("en iyi/en kötü listesine az oylu ürünü sokmaz", () => {
    // Tek kızgın müşterinin oyuyla "ayın en kötüsü" ilan etmek, işletmeyi
    // yanlış yere baktırır.
    const puanlar = urunPuanlari([
      ...Array.from({ length: 6 }, () => puan("Latte", 4)),
      ...Array.from({ length: 6 }, () => puan("Kek", 2)),
      puan("Deneme Kahve", 1),
    ]);
    const { enIyi, enKotu } = enIyiEnKotu(puanlar);
    expect(enIyi[0].itemName).toBe("Latte");
    expect(enKotu[0].itemName).toBe("Kek");
    expect([...enIyi, ...enKotu].map((u) => u.itemName)).not.toContain("Deneme Kahve");
  });
});

describe("zorunlu menü bilgileri", () => {
  describe("alerjenler", () => {
    it("tanınmayan anahtarı atar", () => {
      // Uydurma bir alerjen sessizce kaydedilseydi müşteri tarafında hiç
      // görünmez, işletme ise bildirdiğini sanırdı.
      expect(parseAlerjenler("gluten,uyduruk,sut")).toEqual(["gluten", "sut"]);
    });

    it("büyük harf ve boşluğa dayanıklı", () => {
      expect(parseAlerjenler(" Gluten , SUT ")).toEqual(["gluten", "sut"]);
    });

    it("tekrarı teke indirir", () => {
      expect(parseAlerjenler("gluten,gluten")).toEqual(["gluten"]);
    });

    it("boş girdi boş liste", () => {
      expect(parseAlerjenler(null)).toEqual([]);
      expect(parseAlerjenler("")).toEqual([]);
    });

    it("serialize edilen değer geri okunabiliyor", () => {
      const ham = serializeAlerjenler(["sut", "gluten", "uyduruk"]);
      expect(parseAlerjenler(ham)).toEqual(["sut", "gluten"]);
    });

    it("hiç geçerli alerjen yoksa null saklanır", () => {
      expect(serializeAlerjenler(["uyduruk"])).toBeNull();
    });
  });

  describe("özel bileşenler", () => {
    it("alkol ve domuz tanınır, gerisi atılır", () => {
      expect(parseOzelBilesenler("alkol,domuz,gluten")).toEqual(["alkol", "domuz"]);
    });

    it("alerjen anahtarlarından ayrı tutulur", () => {
      // İkisi aynı listede olsaydı "alerjenim yok" filtresi alkolü de
      // eler, yanlış sonuç verirdi.
      expect(parseAlerjenler("alkol")).toEqual([]);
      expect(parseOzelBilesenler("sut")).toEqual([]);
    });
  });

  describe("kalori", () => {
    it("boş değer null (girilmemiş)", () => {
      expect(parseKalori("")).toBeNull();
      expect(parseKalori("   ")).toBeNull();
    });

    it("tam sayıyı okur", () => {
      expect(parseKalori("320")).toBe(320);
    });

    it("ondalığı yuvarlar, virgülü kabul eder", () => {
      expect(parseKalori("320,4")).toBe(320);
      expect(parseKalori("320.6")).toBe(321);
    });

    it("anlamsız değeri reddeder (undefined = hata)", () => {
      // null ile undefined farkı önemli: null "girilmedi", undefined
      // "girildi ama anlaşılmadı" — ikincisinde form hata göstermeli.
      expect(parseKalori("abc")).toBeUndefined();
      expect(parseKalori("-5")).toBeUndefined();
      expect(parseKalori("999999")).toBeUndefined();
    });
  });
});
