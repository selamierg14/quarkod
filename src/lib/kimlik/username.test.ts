import { describe, expect, it } from "vitest";
import { alanDogrula } from "../cekirdek/desenler";
import { normalizePhone, toUsername, usernameProblem } from "./username";

describe("toUsername", () => {
  it("Türkçe karakterleri ASCII'ye indirir", () => {
    expect(toUsername("Şükrü Öztürk")).toBe("sukru.ozturk");
    expect(toUsername("Çağrı")).toBe("cagri");
    expect(toUsername("IŞIK")).toBe("isik");
  });

  it("boşluk ve işaretleri noktaya çevirir, tekrarı sadeleştirir", () => {
    expect(toUsername("ali   veli")).toBe("ali.veli");
    // Tire artık geçerli bir karakter (tohumlanmış hesapların çoğu tireli),
    // ama tekrarı nokta gibi sadeleşiyor.
    expect(toUsername("a--b__c")).toBe("a-b__c");
  });

  it("baş ve sondaki ayraçları kırpar", () => {
    expect(toUsername("  .ali.  ")).toBe("ali");
  });
});

describe("usernameProblem", () => {
  it("geçerli adı kabul eder", () => {
    expect(usernameProblem("patron")).toBeNull();
    expect(usernameProblem("ege.cunda_1")).toBeNull();
  });

  it("kısa, uzun ve geçersiz karakterli adı reddeder", () => {
    expect(usernameProblem("ab")).not.toBeNull();
    expect(usernameProblem("a".repeat(40))).not.toBeNull();
    // Türkçe karakter bilerek yasak: telefonda ı/i karışması giriş engeller.
    expect(usernameProblem("şükrü")).not.toBeNull();
    expect(usernameProblem("Ali")).not.toBeNull();
    expect(usernameProblem("ali veli")).not.toBeNull();
  });
});

describe("normalizePhone", () => {
  it("yaygın yazımları tek biçime indirir", () => {
    const beklenen = "+905364901001";
    expect(normalizePhone("0536 490 10 01")).toBe(beklenen);
    expect(normalizePhone("5364901001")).toBe(beklenen);
    expect(normalizePhone("+90 536 490 10 01")).toBe(beklenen);
  });

  it("cep olmayanı ve bozuğu reddeder", () => {
    expect(normalizePhone("0212 111 22 33")).toBeNull();
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });
});

describe("desenler.ts ile aynı kümeyi tarif ediyor", () => {
  /**
   * Kullanıcı adının biçimi İKİ yerde ilan ediliyor: burada (sunucu
   * doğrulaması) ve desenler.ts'te (arayüzün `pattern` niteliği). İkisi
   * ayrışırsa ortaya en sinsi hata çıkıyor — arayüz kabul ediyor, sunucu
   * reddediyor (ya da tersi) ve kullanıcı sebebini göremiyor.
   *
   * Aynı örnek kümesi iki kapıdan da geçiriliyor; ayrışan tek örnek testi
   * kırar.
   */
  const ornekler = [
    "ada.kahvesi",
    "garson_01",
    "kusdili-kahvecisi.demo",
    "abc",
    "a".repeat(32),
    // reddedilmesi beklenenler
    "ab",
    "a".repeat(33),
    "Buyuk.Harf",
    "türkçe",
    "boşluk var",
    "ad@soyad",
    "",
  ];

  it("her örnekte iki taraf aynı kararı veriyor", () => {
    for (const ornek of ornekler) {
      const buradaGecerli = usernameProblem(ornek) === null;
      const desendeGecerli = alanDogrula(ornek, "kullaniciAdi", "Kullanıcı adı").ok;
      expect(desendeGecerli, `ayrışma: ${JSON.stringify(ornek)}`).toBe(buradaGecerli);
    }
  });

  it("toUsername'in ÜRETTİĞİ ad her zaman geçerli", () => {
    // Türetim ile doğrulama ayrışırsa, e-postadan üretilen kullanıcı adı
    // kendi kuralımıza takılır ve kullanıcı hiç açılamaz.
    const kaynaklar = [
      "Şükrü Öztürk",
      "info@ada-kahvesi.com",
      "Nefes Cafe & Bistro",
      "---abc---",
      "a.b..c",
    ];
    for (const kaynak of kaynaklar) {
      const uretilen = toUsername(kaynak);
      if (uretilen.length < 3) continue; // çok kısa kalan ad ayrı bir dal
      expect(usernameProblem(uretilen), `${kaynak} → ${uretilen}`).toBeNull();
    }
  });
});
