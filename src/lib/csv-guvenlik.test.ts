import { describe, expect, it } from "vitest";
import { toCsv } from "./feedback-filters";

/**
 * CSV'ye giren yorumları anketi dolduran müşteri yazıyor; dosyayı açan ise
 * işletme sahibi. Aradaki bu güven farkı yüzünden hücrelerin Excel'de formül
 * olarak çalışabilmesi, uzaktan komut çalıştırma anlamına geliyordu.
 */
describe("toCsv formül enjeksiyonu", () => {
  it("formül karakteriyle başlayan hücreyi etkisizleştirir", () => {
    for (const zararli of [
      '=cmd|\'/c calc\'!A1',
      "+1+1",
      "-2+3",
      "@SUM(A1:A9)",
      '=HYPERLINK("http://kotu.example","tikla")',
    ]) {
      const csv = toCsv([[zararli]]);
      // Tek tırnak, Excel'in hücreyi metin saymasını sağlar.
      expect(csv).toContain(`"'${zararli.replace(/"/g, '""')}"`);
    }
  });

  it("sıradan metni bozmaz", () => {
    const csv = toCsv([["Yemek güzeldi", "5", "Masa 3"]]);
    expect(csv).toContain('"Yemek güzeldi"');
    expect(csv).not.toContain("'Yemek");
  });

  it("çift tırnağı kaçırmayı sürdürür", () => {
    expect(toCsv([['servis "çok" iyiydi']])).toContain('"servis ""çok"" iyiydi"');
  });

  it("Excel'in Türkçe ayarı için BOM ve noktalı virgül kullanır", () => {
    const csv = toCsv([["a", "b"]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain('"a";"b"');
  });
});
