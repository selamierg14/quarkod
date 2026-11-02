import { describe, expect, it } from "vitest";
import { EN_COK_KOPYA, girisKartiVarMi, kopyaCoz, kopyalariYay } from "./qr-kopya";

type Kart = { etiket: string; url: string; girisMi: boolean };

const KARTLAR: Kart[] = [
  { etiket: "Giriş", url: "/f/kafe/giris", girisMi: true },
  { etiket: "Masa 1", url: "/f/kafe/1", girisMi: false },
  { etiket: "Masa 2", url: "/f/kafe/2", girisMi: false },
];

describe("kopyaCoz", () => {
  it("geçerli sayıyı kabul eder", () => {
    expect(kopyaCoz("30")).toBe(30);
    expect(kopyaCoz(12)).toBe(12);
  });

  it("boş ve çöp değerde 1 döner", () => {
    expect(kopyaCoz(undefined)).toBe(1);
    expect(kopyaCoz("")).toBe(1);
    expect(kopyaCoz("otuz")).toBe(1);
  });

  it("sıfır ve negatifi 1'e çeker", () => {
    expect(kopyaCoz("0")).toBe(1);
    expect(kopyaCoz("-5")).toBe(1);
  });

  it("üst sınırı aşamıyor — sunucuyu kilitleyen istek yok", () => {
    expect(kopyaCoz("100000")).toBe(EN_COK_KOPYA);
  });

  it("ondalığı aşağı yuvarlar", () => {
    expect(kopyaCoz("2.9")).toBe(2);
  });
});

describe("kopyalariYay", () => {
  it("yalnızca giriş kartını çoğaltır", () => {
    const sonuc = kopyalariYay(KARTLAR, 3);
    expect(sonuc).toHaveLength(5);
    expect(sonuc.filter((k) => k.girisMi)).toHaveLength(3);
    expect(sonuc.filter((k) => !k.girisMi)).toHaveLength(2);
  });

  it("kopyaların hepsi AYNI adresi gösteriyor", () => {
    const adresler = new Set(
      kopyalariYay(KARTLAR, 4).filter((k) => k.girisMi).map((k) => k.url),
    );
    expect(adresler).toEqual(new Set(["/f/kafe/giris"]));
  });

  it("1 kopyada liste değişmiyor", () => {
    expect(kopyalariYay(KARTLAR, 1)).toEqual(KARTLAR);
    expect(kopyalariYay(KARTLAR, 0)).toEqual(KARTLAR);
  });

  it("giriş kartı yoksa hiçbir şey çoğalmıyor", () => {
    const masalar = KARTLAR.filter((k) => !k.girisMi);
    expect(kopyalariYay(masalar, 10)).toHaveLength(2);
  });

  it("etiketleyici kopya numarasını yazabiliyor", () => {
    const sonuc = kopyalariYay(KARTLAR, 2, (kart, sira, toplam) => ({
      ...kart,
      etiket: `${kart.etiket} (${sira}/${toplam})`,
    }));
    expect(sonuc.map((k) => k.etiket)).toEqual([
      "Giriş (1/2)",
      "Giriş (2/2)",
      "Masa 1",
      "Masa 2",
    ]);
  });

  it("sıra korunuyor: kopyalar yan yana", () => {
    const sonuc = kopyalariYay(KARTLAR, 3).map((k) => k.etiket);
    expect(sonuc).toEqual(["Giriş", "Giriş", "Giriş", "Masa 1", "Masa 2"]);
  });
});

describe("girisKartiVarMi", () => {
  it("giriş kartını tanır", () => {
    expect(girisKartiVarMi(KARTLAR)).toBe(true);
    expect(girisKartiVarMi(KARTLAR.filter((k) => !k.girisMi))).toBe(false);
  });
});
