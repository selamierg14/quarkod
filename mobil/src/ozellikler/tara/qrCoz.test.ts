import { describe, it, expect } from "vitest";
import { qrCoz } from "./qrCoz";

describe("qrCoz", () => {
  it("masa karekodundan mekan ve masayı çıkarır", () => {
    expect(qrCoz("https://biyerlere.com/f/moda-sahil-cafe/12")).toEqual({
      slug: "moda-sahil-cafe",
      masa: "12",
    });
  });

  it("menü/anket kısayollarını da kabul eder", () => {
    expect(qrCoz("https://biyerlere.com/f/kafe/3/menu")).toEqual({ slug: "kafe", masa: "3" });
    expect(qrCoz("https://biyerlere.com/f/kafe/3/anket")).toEqual({ slug: "kafe", masa: "3" });
  });

  it("masasız giriş karekodunda masa null olur", () => {
    // "menu" masa numarası sanılırsa sunucuya olmayan bir masa gider.
    expect(qrCoz("https://biyerlere.com/f/kafe/menu")).toEqual({ slug: "kafe", masa: null });
    expect(qrCoz("https://biyerlere.com/f/kafe")).toEqual({ slug: "kafe", masa: null });
  });

  it("yüzde kodlanmış masa adını çözer", () => {
    expect(qrCoz("https://biyerlere.com/f/kafe/Teras%20A1")).toEqual({
      slug: "kafe",
      masa: "Teras A1",
    });
  });

  it("bozuk yüzde kodlamasında çökmez", () => {
    expect(qrCoz("https://biyerlere.com/f/kafe/%E0%A4%A")).toEqual({
      slug: "kafe",
      masa: "%E0%A4%A",
    });
  });

  it("geliştirme ortamındaki IP adresli kodu tanır", () => {
    // Alan adı bilerek kontrol edilmiyor: geliştirmede LAN IP'si,
    // canlıda kendi alan adı, ileride özel alan adları olabilir.
    expect(qrCoz("http://192.168.1.24:3000/f/kafe/7")).toEqual({ slug: "kafe", masa: "7" });
  });

  it("şemasız ve düz yol biçimlerini de çözer", () => {
    expect(qrCoz("biyerlere.com/f/kafe/2")).toEqual({ slug: "kafe", masa: "2" });
    expect(qrCoz("/f/kafe/2")).toEqual({ slug: "kafe", masa: "2" });
  });

  it("baştaki ve sondaki boşlukları yok sayar", () => {
    expect(qrCoz("  https://biyerlere.com/f/kafe/2  ")).toEqual({ slug: "kafe", masa: "2" });
  });

  it("bize ait olmayan karekodu reddeder", () => {
    expect(qrCoz("https://baska-site.com/kampanya/42")).toBeNull();
    expect(qrCoz("WIFI:S=KafeAg;T=WPA;P=sifre;;")).toBeNull();
    expect(qrCoz("")).toBeNull();
    expect(qrCoz("   ")).toBeNull();
  });

  it("slug'ı olmayan yarım adresi reddeder", () => {
    expect(qrCoz("https://biyerlere.com/f/")).toBeNull();
    expect(qrCoz("https://biyerlere.com/f")).toBeNull();
  });
});
