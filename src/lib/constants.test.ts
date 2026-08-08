import { describe, expect, it } from "vitest";
import {
  DEFAULT_CATEGORIES,
  qrCardText,
  shiftFromDate,
  type BusinessType,
} from "./constants";

describe("shiftFromDate", () => {
  const at = (hour: number) => new Date(2026, 0, 15, hour, 0, 0);

  it("sabah, akşam ve geceyi doğru ayırır", () => {
    expect(shiftFromDate(at(8))).toBe("sabah");
    expect(shiftFromDate(at(18))).toBe("aksam");
    expect(shiftFromDate(at(2))).toBe("gece");
  });

  it("sınırlarda doğru tarafa düşer", () => {
    expect(shiftFromDate(at(6))).toBe("sabah");
    expect(shiftFromDate(at(15))).toBe("sabah");
    expect(shiftFromDate(at(16))).toBe("aksam");
    expect(shiftFromDate(at(22))).toBe("aksam");
    expect(shiftFromDate(at(23))).toBe("gece");
    expect(shiftFromDate(at(5))).toBe("gece");
  });

  it("gece kulübünün kapanış saatini gece sayar", () => {
    expect(shiftFromDate(at(3))).toBe("gece");
  });
});

describe("qrCardText", () => {
  it("işletmenin kendi metni varsa onu kullanır", () => {
    expect(qrCardText("balikci", "Kendi metnimiz")).toBe("Kendi metnimiz");
  });

  it("boş veya sadece boşluk olan metni yok sayar", () => {
    const varsayilan = qrCardText("balikci");
    expect(qrCardText("balikci", "   ")).toBe(varsayilan);
    expect(qrCardText("balikci", null)).toBe(varsayilan);
  });

  it("bilinmeyen tür için de bir metin döner", () => {
    expect(qrCardText("bilinmeyen_tur").length).toBeGreaterThan(0);
  });
});

describe("DEFAULT_CATEGORIES", () => {
  it("her işletme türü için kategori tanımlı", () => {
    for (const type of ["yeme_icme", "balikci", "gece_kulubu"] as BusinessType[]) {
      expect(DEFAULT_CATEGORIES[type].length).toBeGreaterThan(0);
    }
  });

  it("işletme türleri birbirinden farklı kategori seti kullanır", () => {
    // Spec'in temel iddiası buydu: balıkçıda "tazelik", kulüpte "müzik".
    expect(DEFAULT_CATEGORIES.balikci).not.toEqual(DEFAULT_CATEGORIES.gece_kulubu);
    expect(DEFAULT_CATEGORIES.balikci.join()).toMatch(/taze/i);
    expect(DEFAULT_CATEGORIES.gece_kulubu.join()).toMatch(/müzik/i);
  });
});
