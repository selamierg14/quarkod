import { describe, it, expect } from "vitest";
import {
  metinAlani,
  sayiAlani,
  listeAlani,
  secenekAlani,
  tarihAlani,
  ilkHata,
} from "./girdi";

/**
 * Bu testlerin odağı ÜST SINIRLAR.
 *
 * Projede alt sınırlar (zorunlu alan, "en az 1") baştan vardı; eksik olan
 * ve sessiz hatalar üreten taraf üst sınırlardı — sınırsız metin
 * veritabanına, sınırsız liste arkasındaki döngüye gidiyordu.
 */

describe("metinAlani", () => {
  it("boşlukları kırpar", () => {
    expect(metinAlani("  Ada Kahvesi  ", "Ad")).toEqual({ ok: true, deger: "Ada Kahvesi" });
  });

  it("zorunlu alan boşsa hata verir", () => {
    expect(metinAlani("", "Misafir adı", { enAz: 1 })).toEqual({
      ok: false,
      hata: "Misafir adı gerekli.",
    });
    expect(metinAlani("   ", "Misafir adı", { enAz: 1 }).ok).toBe(false);
  });

  it("isteğe bağlı alan boşsa boş dize döner", () => {
    expect(metinAlani(undefined, "Not")).toEqual({ ok: true, deger: "" });
  });

  it("üst sınırı aşan metni varsayılan olarak KIRPAR", () => {
    const sonuc = metinAlani("a".repeat(5000), "Not", { enCok: 500 });
    expect(sonuc.ok).toBe(true);
    expect(sonuc.ok && sonuc.deger).toHaveLength(500);
  });

  it("kirp:false verildiğinde reddeder", () => {
    // Kimlik/kod gibi alanlarda sessiz kesme yanlış kayda yazar.
    expect(metinAlani("a".repeat(50), "Kod", { enCok: 8, kirp: false }).ok).toBe(false);
  });

  it("metin olmayan girdiyi boş sayar", () => {
    expect(metinAlani(42, "Ad")).toEqual({ ok: true, deger: "" });
    expect(metinAlani({ kotu: true }, "Ad")).toEqual({ ok: true, deger: "" });
    expect(metinAlani(null, "Ad", { enAz: 1 }).ok).toBe(false);
  });
});

describe("sayiAlani", () => {
  it("sınırlar içindeki değeri kabul eder", () => {
    expect(sayiAlani("4", "Kişi sayısı", { enAz: 1, enCok: 200 })).toEqual({
      ok: true,
      deger: 4,
    });
  });

  it("üst sınırı aşan değeri reddeder", () => {
    // Asıl açık buydu: alt sınır varken üst sınır yoktu.
    expect(sayiAlani(999999999, "Kişi sayısı", { enAz: 1, enCok: 200 })).toEqual({
      ok: false,
      hata: "Kişi sayısı 1-200 arasında olmalı.",
    });
  });

  it("alt sınırın altını reddeder", () => {
    expect(sayiAlani(0, "Kapasite", { enAz: 1, enCok: 50 }).ok).toBe(false);
    expect(sayiAlani(-5, "Kapasite", { enAz: 1, enCok: 50 }).ok).toBe(false);
  });

  it("ondalık ve sayı olmayanı reddeder", () => {
    expect(sayiAlani(2.5, "Kapasite", { enAz: 1, enCok: 50 }).ok).toBe(false);
    expect(sayiAlani("abc", "Kapasite", { enAz: 1, enCok: 50 }).ok).toBe(false);
    expect(sayiAlani(Infinity, "Kapasite", { enAz: 1, enCok: 50 }).ok).toBe(false);
    expect(sayiAlani(NaN, "Kapasite", { enAz: 1, enCok: 50 }).ok).toBe(false);
  });

  it("boş girdide varsayılana düşer", () => {
    expect(sayiAlani("", "Kapasite", { enAz: 1, enCok: 50, varsayilan: 2 })).toEqual({
      ok: true,
      deger: 2,
    });
    expect(sayiAlani(undefined, "Kapasite", { enAz: 1, enCok: 50, varsayilan: 2 }).ok).toBe(true);
  });

  it("varsayılan yoksa boş girdiyi reddeder", () => {
    expect(sayiAlani("", "Kapasite", { enAz: 1, enCok: 50 }).ok).toBe(false);
  });
});

describe("listeAlani", () => {
  it("tekrarları ayıklar", () => {
    expect(listeAlani(["a", "b", "a"], "Masa", { enCok: 10 })).toEqual({
      ok: true,
      deger: ["a", "b"],
    });
  });

  it("eleman sayısı sınırını uygular", () => {
    // Sınırsız liste = arkasındaki döngüde sınırsız sorgu.
    const cok = Array.from({ length: 5000 }, (_, i) => `id-${i}`);
    expect(listeAlani(cok, "Masa", { enCok: 12 }).ok).toBe(false);
  });

  it("en az seçim kuralını uygular", () => {
    expect(listeAlani([], "Masa", { enAz: 1, enCok: 12 }).ok).toBe(false);
  });

  it("boş ve aşırı uzun elemanları eler", () => {
    expect(listeAlani(["  ", "", "x".repeat(500), "iyi"], "Masa", { enCok: 10 })).toEqual({
      ok: true,
      deger: ["iyi"],
    });
  });
});

describe("secenekAlani", () => {
  const sekiller = ["kare", "yuvarlak"] as const;

  it("tanınan değeri geçirir", () => {
    expect(secenekAlani("yuvarlak", "Şekil", sekiller, "kare")).toEqual({
      ok: true,
      deger: "yuvarlak",
    });
  });

  it("tanınmayan değerde varsayılana düşer", () => {
    expect(secenekAlani("üçgen", "Şekil", sekiller, "kare")).toEqual({
      ok: true,
      deger: "kare",
    });
  });

  it("varsayılan yoksa reddeder", () => {
    // Güvenlik taşıyan alanlarda (rol, durum) varsayılana düşmek yanlış.
    expect(secenekAlani("root", "Rol", ["owner", "garson"] as const).ok).toBe(false);
  });
});

describe("tarihAlani", () => {
  it("geçerli tarihi kabul eder", () => {
    const yarin = new Date(Date.now() + 86400000).toISOString();
    expect(tarihAlani(yarin, "Başlangıç").ok).toBe(true);
  });

  it("geçersiz tarihi reddeder", () => {
    expect(tarihAlani("bugün falan", "Başlangıç").ok).toBe(false);
    expect(tarihAlani("", "Başlangıç").ok).toBe(false);
  });

  it("makul pencerenin dışını reddeder", () => {
    // 1970 ya da 3000 teknik olarak geçerli ama iş açısından hata.
    expect(tarihAlani("1970-01-01", "Başlangıç").ok).toBe(false);
    expect(tarihAlani("3000-01-01", "Başlangıç").ok).toBe(false);
  });
});

describe("ilkHata", () => {
  it("ilk hatayı döndürür", () => {
    expect(
      ilkHata(
        metinAlani("ok", "A"),
        sayiAlani(999, "B", { enAz: 1, enCok: 10 }),
        sayiAlani(5000, "C", { enAz: 1, enCok: 10 }),
      ),
    ).toBe("B 1-10 arasında olmalı.");
  });

  it("hata yoksa null döndürür", () => {
    expect(ilkHata(metinAlani("ok", "A"), sayiAlani(5, "B", { enAz: 1, enCok: 10 }))).toBeNull();
  });
});
