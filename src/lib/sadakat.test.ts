import { describe, expect, it } from "vitest";
import { sadakatDurumuHesapla } from "./sadakat";

describe("sadakatDurumuHesapla", () => {
  it("hiç ziyaret yoksa 0 damga, tam eşik kadar kalan", () => {
    const d = sadakatDurumuHesapla(0);
    expect(d).toMatchObject({ damgaSayisi: 0, kalanZiyaret: 10, hediyeKazanildiMi: false });
  });

  it("eşiğin altında damga sayısı ziyaretle birebir artar", () => {
    const d = sadakatDurumuHesapla(3);
    expect(d).toMatchObject({ damgaSayisi: 3, kalanZiyaret: 7, hediyeKazanildiMi: false });
  });

  it("tam eşikte hediye kazanılır, damga sıfırlanır", () => {
    const d = sadakatDurumuHesapla(10);
    expect(d).toMatchObject({ damgaSayisi: 0, kalanZiyaret: 10, hediyeKazanildiMi: true });
  });

  it("eşiği geçtikten sonra yeni tur başlar", () => {
    const d = sadakatDurumuHesapla(13);
    expect(d).toMatchObject({ damgaSayisi: 3, kalanZiyaret: 7, hediyeKazanildiMi: false });
  });

  it("ikinci eşikte de hediye kazanılır", () => {
    const d = sadakatDurumuHesapla(20);
    expect(d.hediyeKazanildiMi).toBe(true);
  });

  it("özel eşikle çalışır", () => {
    const d = sadakatDurumuHesapla(5, 5);
    expect(d.hediyeKazanildiMi).toBe(true);
  });

  it("negatif ya da bozuk girdiyi 0 gibi ele alır", () => {
    expect(sadakatDurumuHesapla(-5)).toMatchObject({ toplamZiyaret: 0, damgaSayisi: 0 });
  });
});
