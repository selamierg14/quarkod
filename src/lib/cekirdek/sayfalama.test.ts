import { describe, expect, it } from "vitest";
import {
  SAYFA_BOYUTLARI,
  VARSAYILAN_BOYUT,
  aralikMetni,
  boyutCoz,
  cubukGosterilsinMi,
  gecerliBoyutMu,
  sayfaCoz,
  sayfaDurumu,
  toplamSayfa,
} from "./sayfalama";

describe("boyutCoz", () => {
  it("izinli boyutları kabul eder", () => {
    for (const boyut of SAYFA_BOYUTLARI) {
      expect(boyutCoz(String(boyut))).toBe(boyut);
    }
  });

  it("izinsiz değeri varsayılana düşürür — tek istekle tüm tablo çekilemiyor", () => {
    expect(boyutCoz("100000")).toBe(VARSAYILAN_BOYUT);
    expect(boyutCoz("0")).toBe(VARSAYILAN_BOYUT);
    expect(boyutCoz("-25")).toBe(VARSAYILAN_BOYUT);
    expect(boyutCoz("çok")).toBe(VARSAYILAN_BOYUT);
    expect(boyutCoz(undefined)).toBe(VARSAYILAN_BOYUT);
    expect(boyutCoz(null)).toBe(VARSAYILAN_BOYUT);
  });

  it("varsayılan 10", () => {
    expect(VARSAYILAN_BOYUT).toBe(10);
    expect(SAYFA_BOYUTLARI).toEqual([10, 25, 50, 100]);
  });

  it("gecerliBoyutMu ara değerleri reddeder", () => {
    expect(gecerliBoyutMu(25)).toBe(true);
    expect(gecerliBoyutMu(30)).toBe(false);
  });
});

describe("sayfaCoz", () => {
  it("geçersiz ve küçük değerleri 1'e çeker", () => {
    expect(sayfaCoz("0")).toBe(1);
    expect(sayfaCoz("-3")).toBe(1);
    expect(sayfaCoz("abc")).toBe(1);
    expect(sayfaCoz(undefined)).toBe(1);
  });

  it("ondalık sayfayı aşağı yuvarlar", () => {
    expect(sayfaCoz("2.9")).toBe(2);
  });
});

describe("sayfaDurumu", () => {
  it("varsayılanda ilk 10 kaydı verir", () => {
    expect(sayfaDurumu({})).toEqual({ sayfa: 1, boyut: 10, skip: 0, take: 10 });
  });

  it("sayfa ve boyutu Prisma'ya çevirir", () => {
    expect(sayfaDurumu({ sayfa: "3", boyut: "25" })).toEqual({
      sayfa: 3,
      boyut: 25,
      skip: 50,
      take: 25,
    });
  });

  it("toplam verilince sayfayı son sayfaya kırpar", () => {
    // 3 kayıt, 10'luk sayfa → tek sayfa; ?sayfa=99 boş ekran göstermemeli.
    expect(sayfaDurumu({ sayfa: "99" }, 3)).toMatchObject({ sayfa: 1, skip: 0 });
    expect(sayfaDurumu({ sayfa: "99", boyut: "25" }, 60)).toMatchObject({
      sayfa: 3,
      skip: 50,
    });
  });

  it("boş listede 1. sayfada kalır", () => {
    expect(sayfaDurumu({ sayfa: "5" }, 0)).toMatchObject({ sayfa: 1, skip: 0 });
  });
});

describe("toplamSayfa", () => {
  it("tam bölünmeyi ve artığı doğru sayar", () => {
    expect(toplamSayfa(100, 10)).toBe(10);
    expect(toplamSayfa(101, 10)).toBe(11);
    expect(toplamSayfa(9, 10)).toBe(1);
  });

  it("boş listede 1 döner", () => {
    expect(toplamSayfa(0, 10)).toBe(1);
    expect(toplamSayfa(-5, 10)).toBe(1);
  });
});

describe("aralikMetni", () => {
  it("bulunulan aralığı yazar", () => {
    expect(aralikMetni(sayfaDurumu({ sayfa: "2" }), 137)).toBe("11–20 / 137");
  });

  it("son sayfada toplamı aşmaz", () => {
    expect(aralikMetni(sayfaDurumu({ sayfa: "14" }, 137), 137)).toBe("131–137 / 137");
  });

  it("boş listede sayı yazmıyor", () => {
    expect(aralikMetni(sayfaDurumu({}), 0)).toBe("0 kayıt");
  });
});

describe("cubukGosterilsinMi", () => {
  it("kısa listede çubuk çizilmiyor", () => {
    expect(cubukGosterilsinMi(3, 10)).toBe(false);
    expect(cubukGosterilsinMi(10, 10)).toBe(false);
  });

  it("varsayılanı aşan listede çiziliyor", () => {
    expect(cubukGosterilsinMi(11, 10)).toBe(true);
  });

  it("kullanıcı boyutu büyüttüyse çubuk kalıyor — seçimini geri alabilsin", () => {
    expect(cubukGosterilsinMi(3, 50)).toBe(true);
  });
});
