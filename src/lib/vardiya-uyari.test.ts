import { describe, expect, it } from "vitest";
import {
  uyarilariGrupla,
  uyarilariHucreyeDagit,
  vardiyaUyarilariniHesapla,
  type UyariTuru,
  type VardiyaUyarisi,
} from "./vardiya-uyari";
import type { Shift } from "./constants";

/** 24.08.2026 pazartesi başlayan hafta. */
const GUNLER = Array.from({ length: 7 }, (_, i) => new Date(2026, 7, 24 + i));
const TUM: Shift[] = ["sabah", "ogle", "aksam", "gece"];

const atama = (gunIndeksi: number, shift: string, userId = "u1", ad = "Ahmet") => ({
  userId,
  ad,
  date: GUNLER[gunIndeksi],
  shift,
});

/** Boş vardiya uyarıları çoğu testte gürültü; ayıklayan yardımcı. */
const kisiUyarilari = (u: ReturnType<typeof vardiyaUyarilariniHesapla>) =>
  u.filter((x) => x.tur !== "bosVardiya");

describe("yetersiz dinlenme", () => {
  it("gece vardiyasından sonra ertesi sabahı yakalar", () => {
    const uyarilar = kisiUyarilari(
      vardiyaUyarilariniHesapla([atama(0, "gece"), atama(1, "sabah")], GUNLER, TUM),
    );
    expect(uyarilar).toHaveLength(1);
    expect(uyarilar[0].tur).toBe("dinlenme");
    expect(uyarilar[0].gun).toBe("2026-08-25");
    expect(uyarilar[0].mesaj).toContain("Ahmet");
  });

  it("gece → ertesi öğle de yakalanır", () => {
    const uyarilar = kisiUyarilari(
      vardiyaUyarilariniHesapla([atama(0, "gece"), atama(1, "ogle")], GUNLER, TUM),
    );
    expect(uyarilar).toHaveLength(1);
  });

  it("akşam → ertesi sabah yakalanır", () => {
    const uyarilar = kisiUyarilari(
      vardiyaUyarilariniHesapla([atama(0, "aksam"), atama(1, "sabah")], GUNLER, TUM),
    );
    expect(uyarilar).toHaveLength(1);
  });

  it("gece → ertesi akşam sorun değil", () => {
    // Arada tam bir gündüz var; bu makul bir plan.
    expect(
      kisiUyarilari(
        vardiyaUyarilariniHesapla([atama(0, "gece"), atama(1, "aksam")], GUNLER, TUM),
      ),
    ).toEqual([]);
  });

  it("aynı gün iki vardiya dinlenme uyarısı üretmez", () => {
    // Sabah+akşam aynı gün: uzun bir gün ama "ertesi gün" kuralı değil.
    expect(
      kisiUyarilari(
        vardiyaUyarilariniHesapla([atama(0, "sabah"), atama(0, "aksam")], GUNLER, TUM),
      ),
    ).toEqual([]);
  });

  it("araya boş gün girerse uyarmaz", () => {
    expect(
      kisiUyarilari(
        vardiyaUyarilariniHesapla([atama(0, "gece"), atama(2, "sabah")], GUNLER, TUM),
      ),
    ).toEqual([]);
  });

  it("farklı kişileri karıştırmaz", () => {
    // Biri gece, ertesi gün BAŞKASI sabah — kimsenin dinlenmesi kısalmadı.
    expect(
      kisiUyarilari(
        vardiyaUyarilariniHesapla(
          [atama(0, "gece", "u1", "Ahmet"), atama(1, "sabah", "u2", "Ayşe")],
          GUNLER,
          TUM,
        ),
      ),
    ).toEqual([]);
  });
});

describe("aralıksız çalışma", () => {
  it("altı gün üst üste çalışmayı uyarır", () => {
    const atamalar = [0, 1, 2, 3, 4, 5].map((i) => atama(i, "sabah"));
    const uyarilar = kisiUyarilari(
      vardiyaUyarilariniHesapla(atamalar, GUNLER, TUM),
    ).filter((u) => u.tur === "aralikszCalisma");
    expect(uyarilar).toHaveLength(1);
    expect(uyarilar[0].mesaj).toContain("6 gün");
  });

  it("beş gün üst üste uyarmaz", () => {
    const atamalar = [0, 1, 2, 3, 4].map((i) => atama(i, "sabah"));
    expect(
      kisiUyarilari(vardiyaUyarilariniHesapla(atamalar, GUNLER, TUM)).filter(
        (u) => u.tur === "aralikszCalisma",
      ),
    ).toEqual([]);
  });

  it("araya izin günü girerse seri kırılır", () => {
    // 0-2 ve 4-6: iki ayrı üçlü seri, hiçbiri eşiği geçmiyor.
    const atamalar = [0, 1, 2, 4, 5, 6].map((i) => atama(i, "sabah"));
    expect(
      kisiUyarilari(vardiyaUyarilariniHesapla(atamalar, GUNLER, TUM)).filter(
        (u) => u.tur === "aralikszCalisma",
      ),
    ).toEqual([]);
  });

  it("yedi günün tamamı çalışılınca uyarır", () => {
    const atamalar = [0, 1, 2, 3, 4, 5, 6].map((i) => atama(i, "sabah"));
    const uyarilar = kisiUyarilari(
      vardiyaUyarilariniHesapla(atamalar, GUNLER, TUM),
    ).filter((u) => u.tur === "aralikszCalisma");
    expect(uyarilar).toHaveLength(1);
    expect(uyarilar[0].mesaj).toContain("7 gün");
  });

  it("aynı gün iki vardiya seriyi iki gün saymaz", () => {
    const atamalar = [
      ...[0, 1, 2, 3, 4].map((i) => atama(i, "sabah")),
      atama(0, "aksam"),
    ];
    expect(
      kisiUyarilari(vardiyaUyarilariniHesapla(atamalar, GUNLER, TUM)).filter(
        (u) => u.tur === "aralikszCalisma",
      ),
    ).toEqual([]);
  });
});

describe("boş vardiya", () => {
  it("kimsenin atanmadığı vardiyayı bildirir", () => {
    const uyarilar = vardiyaUyarilariniHesapla(
      [atama(0, "sabah")],
      [GUNLER[0]],
      ["sabah", "aksam"],
    ).filter((u) => u.tur === "bosVardiya");

    expect(uyarilar).toHaveLength(1);
    expect(uyarilar[0].shift).toBe("aksam");
  });

  it("işletmede kapalı vardiyayı boş saymaz", () => {
    // Gece vardiyası hiç kullanılmıyorsa "kimse atanmadı" demek anlamsız.
    const uyarilar = vardiyaUyarilariniHesapla(
      [atama(0, "sabah")],
      [GUNLER[0]],
      ["sabah"],
    ).filter((u) => u.tur === "bosVardiya");
    expect(uyarilar).toEqual([]);
  });
});

describe("hücreye dağıtma", () => {
  it("uyarıları gün:vardiya anahtarına toplar", () => {
    const uyarilar = vardiyaUyarilariniHesapla(
      [atama(0, "gece"), atama(1, "sabah")],
      GUNLER,
      ["sabah", "gece"],
    );
    const harita = uyarilariHucreyeDagit(uyarilar);
    const hucre = harita.get("2026-08-25:sabah") ?? [];
    expect(hucre.some((u) => u.tur === "dinlenme")).toBe(true);
  });

  it("hücresi olmayan uyarıyı (aralıksız çalışma) dağıtmaz", () => {
    const atamalar = [0, 1, 2, 3, 4, 5].map((i) => atama(i, "sabah"));
    const harita = uyarilariHucreyeDagit(
      vardiyaUyarilariniHesapla(atamalar, GUNLER, ["sabah"]),
    );
    for (const liste of harita.values()) {
      expect(liste.every((u) => u.tur !== "aralikszCalisma")).toBe(true);
    }
  });
});

describe("bilinmeyen veri", () => {
  it("tanınmayan vardiya etiketini yok sayar", () => {
    expect(
      kisiUyarilari(
        vardiyaUyarilariniHesapla([atama(0, "kahvalti"), atama(1, "sabah")], GUNLER, TUM),
      ),
    ).toEqual([]);
  });

  it("boş çizelgede yalnızca boş vardiya uyarısı üretir", () => {
    const uyarilar = vardiyaUyarilariniHesapla([], GUNLER, ["sabah"]);
    expect(uyarilar).toHaveLength(7);
    expect(uyarilar.every((u) => u.tur === "bosVardiya")).toBe(true);
  });
});

describe("uyarı gruplama", () => {
  const uyari = (ad: string, tur: UyariTuru, gun: string): VardiyaUyarisi => ({
    tur,
    userId: ad,
    ad,
    gun,
    mesaj: `${ad}: ${tur} ${gun}`,
  });

  it("aynı kişinin aynı tür uyarısını tek satırda toplar", () => {
    // Ekranda dört kez alt alta tekrarlanan cümlenin kaynağı buydu.
    const ozet = uyarilariGrupla([
      uyari("ahmet", "dinlenme", "2026-01-01"),
      uyari("ahmet", "dinlenme", "2026-01-02"),
      uyari("ahmet", "dinlenme", "2026-01-03"),
      uyari("ahmet", "dinlenme", "2026-01-04"),
    ]);

    expect(ozet).toHaveLength(1);
    expect(ozet[0].adet).toBe(4);
    expect(ozet[0].baslik).toBe("ahmet — 4 kez kısa dinlenme");
    expect(ozet[0].detaylar).toHaveLength(4);
  });

  it("aynı kişinin farklı türlerini ayrı tutar", () => {
    const ozet = uyarilariGrupla([
      uyari("ahmet", "dinlenme", "2026-01-01"),
      uyari("ahmet", "aralikszCalisma", "2026-01-01"),
    ]);
    expect(ozet).toHaveLength(2);
  });

  it("tek seferlik uyarıda sayı yazmaz", () => {
    const ozet = uyarilariGrupla([uyari("ayse", "aralikszCalisma", "2026-01-01")]);
    expect(ozet[0].baslik).toBe("ayse — aralıksız çalışma");
  });

  it("en çok tekrarlayan en üstte", () => {
    const ozet = uyarilariGrupla([
      uyari("ayse", "dinlenme", "2026-01-01"),
      uyari("ahmet", "dinlenme", "2026-01-01"),
      uyari("ahmet", "dinlenme", "2026-01-02"),
    ]);
    expect(ozet[0].ad).toBe("ahmet");
  });

  it("boş vardiya uyarıları gruplamaya girmez", () => {
    // Onlar kişiye ait değil; ekranda ayrı bir satır olarak sayılıyor.
    const ozet = uyarilariGrupla([
      { tur: "bosVardiya", gun: "2026-01-01", mesaj: "boş" },
      uyari("ahmet", "dinlenme", "2026-01-01"),
    ]);
    expect(ozet).toHaveLength(1);
    expect(ozet[0].ad).toBe("ahmet");
  });
});
