import { describe, expect, it } from "vitest";
import { foldTr } from "./text";

/**
 * Bu testler asıl olarak şu hatayı bir daha yaşamamak için:
 * SQLite'ın LIKE'ı yalnızca ASCII harflerde büyük-küçük eşleştirir, bu yüzden
 * "şikayet" araması "ŞİKAYET" kaydını bulamıyordu.
 */
describe("foldTr", () => {
  it("Türkçe büyük harfleri küçültür", () => {
    expect(foldTr("ŞİKAYET")).toBe("sikayet");
    expect(foldTr("Şikayet")).toBe(foldTr("şikayet"));
  });

  it("aksanlı harfleri ASCII karşılığına indirir", () => {
    expect(foldTr("çğıöşü")).toBe("cgiosu");
    expect(foldTr("ÇĞIİÖŞÜ")).toBe("cgiiosu");
  });

  it("Türkçe karakter yazmadan arayanı da bulur", () => {
    // Personel çoğu zaman "sikayet" yazar; "şikâyet" kaydını bulmalı.
    expect(foldTr("şikâyet")).toContain("sikayet");
  });

  it("büyük I ile küçük ı aynı yere düşer", () => {
    expect(foldTr("IŞIK")).toBe(foldTr("ışık"));
  });

  it("boş metinde patlamaz", () => {
    expect(foldTr("")).toBe("");
  });
});
