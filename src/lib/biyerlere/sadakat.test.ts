import { describe, expect, it } from "vitest";
import { sadakatDurumuHesapla , acilmasiGerekenKuponVarMi } from "./sadakat";

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

describe("acilmasiGerekenKuponVarMi", () => {
  it("eşiğe ulaşılmadan kupon açılmaz", () => {
    expect(acilmasiGerekenKuponVarMi(9, 0)).toBe(false);
  });

  it("eşik dolduğunda kupon açılır", () => {
    expect(acilmasiGerekenKuponVarMi(10, 0)).toBe(true);
  });

  it("aynı kart için ikinci kupon açılmaz (idempotent)", () => {
    expect(acilmasiGerekenKuponVarMi(10, 1)).toBe(false);
    expect(acilmasiGerekenKuponVarMi(15, 1)).toBe(false);
  });

  it("KAÇAN kuponu sonraki ziyarette telafi eder", () => {
    // Asıl düzeltilen hata: 10. ziyarette kupon yazımı düşerse eski kod
    // bir daha asla kupon açmıyordu (11 % 10 = 1, eşik koşulu sağlanmaz).
    expect(acilmasiGerekenKuponVarMi(11, 0)).toBe(true);
    expect(acilmasiGerekenKuponVarMi(19, 0)).toBe(true);
  });

  it("ikinci kart dolduğunda ikinci kupon açılır", () => {
    expect(acilmasiGerekenKuponVarMi(20, 1)).toBe(true);
    expect(acilmasiGerekenKuponVarMi(20, 2)).toBe(false);
  });

  it("bozuk sayılarda çökmez", () => {
    expect(acilmasiGerekenKuponVarMi(-5, 0)).toBe(false);
    expect(acilmasiGerekenKuponVarMi(10, -3)).toBe(true);
    expect(acilmasiGerekenKuponVarMi(10.9, 0)).toBe(true);
  });
});
