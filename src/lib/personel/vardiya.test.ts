import { describe, expect, it } from "vitest";
import { etkinVardiyalar, gecerliVardiyaMi, vardiyaHesapla, type VardiyaAyarlari } from "./vardiya";

const VARSAYILAN: VardiyaAyarlari = {
  vardiyaSabahAktif: true,
  vardiyaSabahSaat: "06:00",
  vardiyaOgleAktif: false,
  vardiyaOgleSaat: "12:00",
  vardiyaAksamAktif: true,
  vardiyaAksamSaat: "16:00",
  vardiyaGeceAktif: true,
  vardiyaGeceSaat: "23:00",
};

const at = (hour: number, dakika = 0) => new Date(2026, 0, 15, hour, dakika, 0);

describe("vardiyaHesapla", () => {
  it("varsayılan ayarlarda sabah/akşam/gece'yi doğru ayırır", () => {
    expect(vardiyaHesapla(at(8), VARSAYILAN)).toBe("sabah");
    expect(vardiyaHesapla(at(18), VARSAYILAN)).toBe("aksam");
    expect(vardiyaHesapla(at(2), VARSAYILAN)).toBe("gece");
  });

  it("sınırlarda başlangıç saatine düşer", () => {
    expect(vardiyaHesapla(at(6, 0), VARSAYILAN)).toBe("sabah");
    expect(vardiyaHesapla(at(15, 59), VARSAYILAN)).toBe("sabah");
    expect(vardiyaHesapla(at(16, 0), VARSAYILAN)).toBe("aksam");
    expect(vardiyaHesapla(at(23, 0), VARSAYILAN)).toBe("gece");
  });

  it("gece vardiyası kapalıysa gece yarısı bir önceki açık vardiyaya (akşam) dahil olur", () => {
    const ayarlar: VardiyaAyarlari = { ...VARSAYILAN, vardiyaGeceAktif: false };
    expect(vardiyaHesapla(at(23, 30), ayarlar)).toBe("aksam");
    expect(vardiyaHesapla(at(2), ayarlar)).toBe("aksam");
    expect(vardiyaHesapla(at(5, 59), ayarlar)).toBe("aksam");
    expect(vardiyaHesapla(at(6, 0), ayarlar)).toBe("sabah");
  });

  it("öğle açılınca sabah ile akşam arasına giriyor", () => {
    const ayarlar: VardiyaAyarlari = { ...VARSAYILAN, vardiyaOgleAktif: true, vardiyaOgleSaat: "12:00" };
    expect(vardiyaHesapla(at(11, 59), ayarlar)).toBe("sabah");
    expect(vardiyaHesapla(at(12, 0), ayarlar)).toBe("ogle");
    expect(vardiyaHesapla(at(15, 59), ayarlar)).toBe("ogle");
  });

  it("hiçbir vardiya açık değilse null döner", () => {
    const ayarlar: VardiyaAyarlari = {
      vardiyaSabahAktif: false,
      vardiyaSabahSaat: "06:00",
      vardiyaOgleAktif: false,
      vardiyaOgleSaat: "12:00",
      vardiyaAksamAktif: false,
      vardiyaAksamSaat: "16:00",
      vardiyaGeceAktif: false,
      vardiyaGeceSaat: "23:00",
    };
    expect(vardiyaHesapla(at(10), ayarlar)).toBeNull();
  });
});

describe("etkinVardiyalar", () => {
  it("yalnızca açık olanları, SHIFTS sırasıyla döner", () => {
    expect(etkinVardiyalar(VARSAYILAN)).toEqual(["sabah", "aksam", "gece"]);
  });
});

describe("gecerliVardiyaMi", () => {
  it("tanımlı vardiya adlarını kabul eder", () => {
    expect(gecerliVardiyaMi("sabah")).toBe(true);
    expect(gecerliVardiyaMi("ogle")).toBe(true);
    expect(gecerliVardiyaMi("tatil")).toBe(false);
  });
});
