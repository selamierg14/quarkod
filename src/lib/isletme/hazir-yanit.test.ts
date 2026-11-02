import { describe, expect, it } from "vitest";
import { EN_UZUN_YANIT, hazirYanitlar, yerTutucuDoldur } from "./hazir-yanit";

describe("hazirYanitlar", () => {
  it("düşük puanda özür seçeneğiyle başlıyor", () => {
    const liste = hazirYanitlar(1, "Ada Kahve");
    expect(liste[0].etiket).toContain("Özür");
  });

  it("yüksek puanda özür dilemiyor", () => {
    const metinler = hazirYanitlar(5, "Ada Kahve").map((y) => y.metin.toLowerCase());
    expect(metinler.some((m) => m.includes("üzgünüz") || m.includes("özür"))).toBe(false);
    expect(metinler.some((m) => m.includes("teşekkür"))).toBe(true);
  });

  it("orta puanda ayrı bir set veriyor", () => {
    const orta = hazirYanitlar(3, "Ada Kahve").map((y) => y.etiket);
    const dusuk = hazirYanitlar(2, "Ada Kahve").map((y) => y.etiket);
    expect(orta).not.toEqual(dusuk);
  });

  it("her puan için en az bir seçenek var", () => {
    for (const puan of [1, 2, 3, 4, 5]) {
      expect(hazirYanitlar(puan, "Ada Kahve").length).toBeGreaterThan(0);
    }
  });

  it("işletme adını yerleştiriyor, yer tutucu bırakmıyor", () => {
    for (const puan of [1, 3, 5]) {
      for (const yanit of hazirYanitlar(puan, "Ada Kahve")) {
        expect(yanit.metin).not.toContain("{isletme}");
        expect(yanit.metin).toContain("Ada Kahve");
      }
    }
  });

  it("SMS sınırını aşmıyor", () => {
    for (const puan of [1, 3, 5]) {
      for (const yanit of hazirYanitlar(puan, "Ç".repeat(200))) {
        expect(yanit.metin.length).toBeLessThanOrEqual(EN_UZUN_YANIT);
      }
    }
  });
});

describe("yerTutucuDoldur", () => {
  it("birden fazla yer tutucuyu da değiştiriyor", () => {
    expect(yerTutucuDoldur("{isletme} ve {isletme}", " Ada ")).toBe("Ada ve Ada");
  });
});
