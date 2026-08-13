import { describe, expect, it } from "vitest";
import {
  DUSUK_PUAN,
  EN_FAZLA_SECIM,
  detaylariCoz,
  detaylariDerle,
  secenekleriAyristir,
  secenekleriBirlestir,
  sorunSecenekleri,
} from "./anket-detay";

/**
 * Bu dosyanın amacı şikayeti "mekan kötüydü"den "tuvaletler kirliydi"ye
 * indirmek. Buradaki bir kırmızı, patronun yanlış yere personel göndermesi
 * ya da olmayan bir sorunun peşine düşmesi demek.
 */

describe("seçenek listesi ayrıştırma", () => {
  it("virgüllü listeyi temizler", () => {
    expect(secenekleriAyristir(" Tuvaletler , Masalar ,, Zemin ")).toEqual([
      "Tuvaletler",
      "Masalar",
      "Zemin",
    ]);
  });

  it("tekrarları atar", () => {
    // Aynı seçenek iki kez görünürse müşteri hangisini işaretleyeceğini bilemez.
    expect(secenekleriAyristir("Masalar, Masalar")).toEqual(["Masalar"]);
  });

  it("boş girdide boş liste döner", () => {
    expect(secenekleriAyristir(null)).toEqual([]);
    expect(secenekleriAyristir("  ,  , ")).toEqual([]);
  });

  it("listeyi sekiz seçenekle sınırlar", () => {
    // Uzun liste anketi okunmaz yapıyor; müşteri hepsini atlıyor.
    const cok = Array.from({ length: 20 }, (_, i) => `Secenek${i}`).join(",");
    expect(secenekleriAyristir(cok)).toHaveLength(8);
  });

  it("birleştirme boş listede null verir", () => {
    expect(secenekleriBirlestir([])).toBeNull();
    expect(secenekleriBirlestir(["Masalar"])).toBe("Masalar");
  });
});

describe("varsayılan sorun seçenekleri", () => {
  it("işletmenin kendi listesi varsayılanı ezer", () => {
    expect(sorunSecenekleri("Temizlik", "Bahçe,Teras")).toEqual(["Bahçe", "Teras"]);
  });

  it("temizlik kategorisine makul varsayılan verir", () => {
    // Ayara hiç girmeyen işletmede de çalışsın; yoksa özellik ölü doğar.
    expect(sorunSecenekleri("Temizlik", null)).toContain("Tuvaletler");
  });

  it("kategori adını Türkçe duyarsız eşleştirir", () => {
    // "Hız", "HIZ" ve "hiz" aynı kategoridir.
    expect(sorunSecenekleri("Hız", null).length).toBeGreaterThan(0);
    expect(sorunSecenekleri("SERVİS HIZI", null).length).toBeGreaterThan(0);
  });

  it("tanımadığı kategoride hiç soru açmaz", () => {
    // Uydurma seçenek göstermektense sormamak doğru.
    expect(sorunSecenekleri("Kedi dostu mu", null)).toEqual([]);
  });
});

describe("işaretlenen alanların derlenmesi", () => {
  it("düşük puanlı kategoriyi kaydeder", () => {
    const json = detaylariDerle({ Temizlik: ["Tuvaletler"] }, { Temizlik: 1 });
    expect(JSON.parse(json as string)).toEqual({ Temizlik: ["Tuvaletler"] });
  });

  it("puan yükseltilmiş kategoriyi kaydetmez", () => {
    // Müşteri önce 2 verip sonra 5'e çıkardıysa eski işaret taşınmamalı;
    // yoksa patron olmayan bir sorunun peşine düşer.
    expect(detaylariDerle({ Temizlik: ["Tuvaletler"] }, { Temizlik: 5 })).toBeNull();
  });

  it("sınırdaki puanı düşük sayar, bir üstünü saymaz", () => {
    expect(detaylariDerle({ A: ["x"] }, { A: DUSUK_PUAN })).not.toBeNull();
    expect(detaylariDerle({ A: ["x"] }, { A: DUSUK_PUAN + 1 })).toBeNull();
  });

  it("puanı hiç verilmemiş kategoriyi yazmaz", () => {
    expect(detaylariDerle({ Temizlik: ["Tuvaletler"] }, {})).toBeNull();
  });

  it("işaret sayısını sınırlar", () => {
    const cok = Array.from({ length: 10 }, (_, i) => `alan${i}`);
    const json = detaylariDerle({ A: cok }, { A: 1 });
    expect(JSON.parse(json as string).A).toHaveLength(EN_FAZLA_SECIM);
  });

  it("hiç işaret yoksa null döner", () => {
    expect(detaylariDerle({ Temizlik: [] }, { Temizlik: 1 })).toBeNull();
    expect(detaylariDerle({}, {})).toBeNull();
  });
});

describe("kayıtlı detayların çözülmesi", () => {
  it("geçerli kaydı çözer", () => {
    expect(detaylariCoz('{"Temizlik":["Tuvaletler","Zemin"]}')).toEqual({
      Temizlik: ["Tuvaletler", "Zemin"],
    });
  });

  it("bozuk kayıtta paneli düşürmez", () => {
    // Elle düzenlenmiş bir satır yüzünden geri bildirim ekranı açılmamazlık
    // etmemeli.
    expect(detaylariCoz("{bozuk")).toEqual({});
    expect(detaylariCoz("[1,2]")).toEqual({});
    expect(detaylariCoz(null)).toEqual({});
  });

  it("beklenmeyen değerleri eler", () => {
    expect(detaylariCoz('{"A":"metin","B":["x"],"C":[]}')).toEqual({ B: ["x"] });
  });
});
