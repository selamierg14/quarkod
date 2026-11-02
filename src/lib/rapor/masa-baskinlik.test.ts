import { describe, expect, it } from "vitest";
import { masaBaskinliginiTespitEt } from "./masa-baskinlik";

describe("masaBaskinliginiTespitEt", () => {
  it("tek QR kopyalanmış gibi görünen dağılımı yakalar", () => {
    // 6 aktif masa var ama geri bildirimlerin çoğu "Giriş"e yazılıyor.
    const satirlar = [
      { label: "Giriş", count: 42 },
      { label: "Masa 1", count: 2 },
      { label: "Masa 2", count: 1 },
      { label: "Masa 3", count: 1 },
    ];
    const sonuc = masaBaskinliginiTespitEt(satirlar, 6);
    expect(sonuc).not.toBeNull();
    expect(sonuc?.etiket).toBe("Giriş");
    expect(sonuc?.oran).toBeCloseTo(42 / 46);
  });

  it("normal, dengeli dağılımda uyarı vermez", () => {
    const satirlar = [
      { label: "Masa 1", count: 7 },
      { label: "Masa 2", count: 6 },
      { label: "Masa 3", count: 5 },
      { label: "Masa 4", count: 4 },
    ];
    expect(masaBaskinliginiTespitEt(satirlar, 4)).toBeNull();
  });

  it("az aktif masada (zaten tek nokta senaryosu) alarm vermez", () => {
    // Kırılım sayfası bunu "QR noktasına göre" diye ayrı ele alıyor.
    const satirlar = [{ label: "Giriş", count: 30 }];
    expect(masaBaskinliginiTespitEt(satirlar, 1)).toBeNull();
    expect(masaBaskinliginiTespitEt(satirlar, 2)).toBeNull();
  });

  it("az veriyle yanlış alarm vermez", () => {
    const satirlar = [
      { label: "Giriş", count: 4 },
      { label: "Masa 1", count: 1 },
    ];
    expect(masaBaskinliginiTespitEt(satirlar, 5)).toBeNull();
  });

  it("baskınlık eşiğin altındaysa uyarı vermez", () => {
    const satirlar = [
      { label: "Giriş", count: 6 },
      { label: "Masa 1", count: 5 },
      { label: "Masa 2", count: 5 },
    ];
    // 6/16 ≈ %37.5, eşik %60'ın altında.
    expect(masaBaskinliginiTespitEt(satirlar, 5)).toBeNull();
  });

  it("baskın nokta 'Giriş' olmak zorunda değil — herhangi bir masa da kopyalanmış olabilir", () => {
    const satirlar = [
      { label: "Masa 7", count: 20 },
      { label: "Masa 1", count: 1 },
      { label: "Masa 2", count: 1 },
      { label: "Masa 3", count: 1 },
    ];
    const sonuc = masaBaskinliginiTespitEt(satirlar, 5);
    expect(sonuc?.etiket).toBe("Masa 7");
  });
});
