import { describe, expect, it } from "vitest";
import { adAnahtari, foldTr, trSirala } from "./text";

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

describe("adAnahtari — tekrar eden ad kontrolü", () => {
  it("büyük-küçük harf farkını yok sayar (QA: temizlik / Temizlik)", () => {
    expect(adAnahtari("temizlik")).toBe(adAnahtari("Temizlik"));
    expect(adAnahtari("TEMİZLİK")).toBe(adAnahtari("temizlik"));
  });

  it("Türkçe I/İ kuralına uyar", () => {
    expect(adAnahtari("IŞIK")).toBe("ışık");
    expect(adAnahtari("İÇECEK")).toBe("içecek");
    expect(adAnahtari("IŞIK")).not.toBe(adAnahtari("işik"));
  });

  it("baştaki/sondaki ve çift boşlukları sadeleştirir", () => {
    expect(adAnahtari("  Servis   hızı ")).toBe(adAnahtari("servis hızı"));
  });

  it("aksanlı ve aksansız farklı kelimeler ayrı kalır", () => {
    expect(adAnahtari("Kır")).not.toBe(adAnahtari("Kir"));
  });
});

describe("trSirala", () => {
  it("İ ve küçük harfli adları doğru yere koyar (QA: İbrahim en sondaydı)", () => {
    const adlar = ["Zeynep", "ibrahim yıldız", "Ahmet", "İbrahim Aksoy", "Çağla", "Ceren", "Şule", "Selin"];
    expect(trSirala(adlar, (a) => a)).toEqual([
      "Ahmet",
      "Ceren",
      "Çağla",
      // Harf farkı yok sayılıyor; soyadı belirliyor.
      "İbrahim Aksoy",
      "ibrahim yıldız",
      "Selin",
      "Şule",
      "Zeynep",
    ]);
  });

  it("girdiyi değiştirmez", () => {
    const liste = [{ ad: "b" }, { ad: "a" }];
    trSirala(liste, (x) => x.ad);
    expect(liste[0].ad).toBe("b");
  });
});
