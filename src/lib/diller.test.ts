import { describe, expect, it } from "vitest";
import { TUM_ANAHTARLAR, cevir } from "./ceviriler";
import {
  DILLER,
  DIL_LISTESI,
  VARSAYILAN_DIL,
  dilAlgila,
  dilYonu,
  gecerliDilMi,
} from "./diller";

/**
 * Yarı çevrilmiş bir ekran, hiç çevrilmemişten daha kötü görünür: müşteri
 * "bu uygulama bozuk" diye kapatır. Buradaki testler eksik ya da bozuk
 * çeviriyi ekrana çıkmadan yakalıyor.
 */

describe("dil algılama", () => {
  it("telefonun dilini seçer", () => {
    expect(dilAlgila(["en-US", "en"])).toBe("en");
    expect(dilAlgila(["ar"])).toBe("ar");
    expect(dilAlgila(["ru-RU"])).toBe("ru");
  });

  it("bölge kodunu yok sayar", () => {
    // "en-GB" ile "en-US" aynı sözlüğe düşmeli.
    expect(dilAlgila(["en-GB"])).toBe("en");
  });

  it("desteklenen ilk tercihi seçer", () => {
    // Tarayıcı sıralı bir liste verir; kullanıcının ilk tercihi kazanmalı.
    expect(dilAlgila(["de-DE", "fr", "ru"])).toBe("ru");
  });

  it("hiçbiri desteklenmiyorsa Türkçede kalır", () => {
    // Mekân Türkiye'de; bilinmeyen dilde İngilizceye kaçmak yanlış olurdu.
    expect(dilAlgila(["de", "fr"])).toBe(VARSAYILAN_DIL);
    expect(dilAlgila([])).toBe(VARSAYILAN_DIL);
  });

  it("geçersiz kodu reddeder", () => {
    expect(gecerliDilMi("de")).toBe(false);
    expect(gecerliDilMi("ar")).toBe(true);
  });
});

describe("yazı yönü", () => {
  it("Arapça sağdan sola", () => {
    // Yön ters kalırsa hizalamalar bozulur ve ekran okunmaz hale gelir.
    expect(dilYonu("ar")).toBe("rtl");
  });

  it("diğerleri soldan sağa", () => {
    for (const dil of ["tr", "en", "ru"] as const) {
      expect(dilYonu(dil)).toBe("ltr");
    }
  });
});

describe("sözlük bütünlüğü", () => {
  /** Türkçede bilerek boş bırakılanlar. */
  const BOS_OLABILIR = new Set(["kvkk.asilDil"]);

  it("her dilde her metin dolu döner", () => {
    // Tip sistemi eksik anahtarı yakalıyor ama boş dizeyi yakalamıyor;
    // ekranda boş bir düğme olarak görünürdü.
    for (const dil of DIL_LISTESI) {
      for (const anahtar of TUM_ANAHTARLAR) {
        if (BOS_OLABILIR.has(anahtar) && dil === VARSAYILAN_DIL) continue;
        const metin = cevir(dil, anahtar, { no: "1", ad: "Kafe", gun: 90, kanal: "SMS", adet: 3, sayi: 4, terim: "x", tarih: "01.01.2026", boyut: "10 MB" });
        expect(metin.length, `${dil}/${anahtar} boş`).toBeGreaterThan(0);
      }
    }
  });

  it("hiçbir metinde doldurulmamış yer tutucu kalmaz", () => {
    const degiskenler = { no: "1", ad: "Kafe", gun: 90, kanal: "SMS", adet: 3, sayi: 4, terim: "x", tarih: "01.01.2026", boyut: "10 MB" };
    for (const dil of DIL_LISTESI) {
      for (const anahtar of TUM_ANAHTARLAR) {
        expect(cevir(dil, anahtar, degiskenler), `${dil}/${anahtar}`).not.toMatch(/\{\w+\}/);
      }
    }
  });

  it("diller birbirinden farklı metin verir", () => {
    // Bir dil kopyala-yapıştır sonucu Türkçe kalmış olabilir; en görünür
    // metinlerde bunu yakalıyoruz.
    const tr = cevir("tr", "anket.baslik");
    for (const dil of ["en", "ar", "ru"] as const) {
      expect(cevir(dil, "anket.baslik"), `${dil} çevrilmemiş`).not.toBe(tr);
    }
  });
});

describe("yer tutucular", () => {
  it("değişkeni yerine koyar", () => {
    expect(cevir("tr", "ortak.masa", { no: "12" })).toBe("Masa 12");
    expect(cevir("en", "ortak.masa", { no: "12" })).toBe("Table 12");
  });

  it("her dilde tüm yer tutucular dolar", () => {
    // Eksik kalan bir {ad}, ekranda süslü parantezle görünür.
    for (const dil of DIL_LISTESI) {
      const ozet = cevir(dil, "kvkk.ozet", { ad: "Kafe", gun: 90 });
      expect(ozet, `${dil} yer tutucu açıkta`).not.toMatch(/[{}]/);

      const iys = cevir(dil, "iys.metin", { ad: "Kafe", kanal: "SMS" });
      expect(iys, `${dil} yer tutucu açıkta`).not.toMatch(/[{}]/);
    }
  });

  it("bilinmeyen değişkeni olduğu gibi bırakır", () => {
    // Sessizce boşluk basmak, eksik veriyi gizlerdi.
    expect(cevir("tr", "ortak.masa", { yanlis: "x" })).toContain("{no}");
  });
});

describe("hukuki metin", () => {
  it("Türkçede asıl dil notu gösterilmez", () => {
    // Türkçe zaten bağlayıcı metin; kendini kaynak göstermesi anlamsız.
    expect(cevir("tr", "kvkk.asilDil")).toBe("");
  });

  it("çevirilerde Türkçenin bağlayıcı olduğu yazar", () => {
    // Çeviri hatası onayı tartışmaya açmasın diye asıl metin işaretleniyor.
    for (const dil of ["en", "ar", "ru"] as const) {
      expect(cevir(dil, "kvkk.asilDil").length).toBeGreaterThan(0);
    }
  });

  it("saklama süresi metinde geçer", () => {
    for (const dil of DIL_LISTESI) {
      expect(cevir(dil, "kvkk.sureMetin", { gun: 90 })).toContain("90");
    }
  });
});

describe("dil listesi", () => {
  it("her dilin kısa kodu ve adı var", () => {
    for (const dil of DIL_LISTESI) {
      expect(DILLER[dil].kisa.length).toBeGreaterThan(0);
      expect(DILLER[dil].ad.length).toBeGreaterThan(0);
    }
  });

  it("Türkçe listede ve varsayılan", () => {
    expect(DIL_LISTESI).toContain(VARSAYILAN_DIL);
  });
});
