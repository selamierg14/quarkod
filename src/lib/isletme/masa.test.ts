import { describe, expect, it } from "vitest";
import { masaSirala } from "./masa";

const m = (tableNumber: string, isEntrance = false) => ({ tableNumber, isEntrance });

describe("masaSirala", () => {
  it("sayıları metin gibi değil sayı gibi sıralar", () => {
    // Veritabanının metin sıralaması 1, 10, 11, 12, 2, 3… veriyordu; basılı
    // kartla eşleştirmeye çalışan kişi için kullanılamaz bir sıraydı.
    const girdi = [m("10"), m("2"), m("1"), m("12"), m("3"), m("11")];
    expect(masaSirala(girdi).map((x) => x.tableNumber)).toEqual([
      "1",
      "2",
      "3",
      "10",
      "11",
      "12",
    ]);
  });

  it("giriş QR'ını her zaman en üste alır", () => {
    const girdi = [m("3"), m("giris", true), m("1")];
    expect(masaSirala(girdi).map((x) => x.tableNumber)).toEqual(["giris", "1", "3"]);
  });

  it("harf içeren adlarda da sayıyı doğru karşılaştırır", () => {
    const girdi = [m("VIP-10"), m("VIP-2"), m("Teras")];
    expect(masaSirala(girdi).map((x) => x.tableNumber)).toEqual([
      "Teras",
      "VIP-2",
      "VIP-10",
    ]);
  });

  it("girdiyi yerinde değiştirmez", () => {
    const girdi = [m("2"), m("1")];
    masaSirala(girdi);
    expect(girdi.map((x) => x.tableNumber)).toEqual(["2", "1"]);
  });
});
