import { describe, expect, it } from "vitest";
import {
  ROZETLER,
  ROZET_ANAHTARLARI,
  gecerliRozetMi,
  hakEdilenRozetler,
  seviye,
  sonrakiSeviyeyeKalan,
  yeniRozetler,
  type ZiyaretOzeti,
} from "./rozet";

const BOS: ZiyaretOzeti = {
  toplamZiyaret: 0,
  farkliMekan: 0,
  canliMuzikMekani: 0,
  enCokZiyaretEdilenMekan: 0,
};

describe("rozet kazanma", () => {
  it("hiç ziyaret yoksa rozet yok", () => {
    expect(hakEdilenRozetler(BOS)).toEqual([]);
  });

  it("ilk ziyaret İlk Adım'ı açar", () => {
    expect(
      hakEdilenRozetler({ ...BOS, toplamZiyaret: 1, farkliMekan: 1 }),
    ).toEqual(["ilkAdim"]);
  });

  it("5 farklı mekan Kahve Gurmesi'ni açar", () => {
    const kazanilan = hakEdilenRozetler({
      ...BOS,
      toplamZiyaret: 5,
      farkliMekan: 5,
    });
    expect(kazanilan).toContain("kahveGurmesi");
    expect(kazanilan).not.toContain("ustaKasif");
  });

  it("10 farklı mekan hem Kahve Gurmesi hem Usta Kaşif", () => {
    const kazanilan = hakEdilenRozetler({
      ...BOS,
      toplamZiyaret: 10,
      farkliMekan: 10,
    });
    expect(kazanilan).toContain("kahveGurmesi");
    expect(kazanilan).toContain("ustaKasif");
  });

  it("aynı mekana 10 kez gitmek Usta Kaşif açmaz", () => {
    // "Kaşif" farklı yer keşfetmekle ilgili; tek mekana sadakat
    // Müdavim rozetinin işi.
    const kazanilan = hakEdilenRozetler({
      ...BOS,
      toplamZiyaret: 10,
      farkliMekan: 1,
      enCokZiyaretEdilenMekan: 10,
    });
    expect(kazanilan).not.toContain("ustaKasif");
    expect(kazanilan).toContain("mudavim");
  });

  it("3 canlı müzik mekanı Gece Kuşu'nu açar", () => {
    expect(
      hakEdilenRozetler({
        ...BOS,
        toplamZiyaret: 3,
        farkliMekan: 3,
        canliMuzikMekani: 3,
      }),
    ).toContain("geceKusu");
  });

  it("eşiğin bir altı rozeti açmaz", () => {
    expect(
      hakEdilenRozetler({ ...BOS, toplamZiyaret: 4, farkliMekan: 4 }),
    ).not.toContain("kahveGurmesi");
    expect(
      hakEdilenRozetler({ ...BOS, toplamZiyaret: 3, enCokZiyaretEdilenMekan: 3 }),
    ).not.toContain("mudavim");
  });
});

describe("yeni rozetler", () => {
  const ozet: ZiyaretOzeti = {
    ...BOS,
    toplamZiyaret: 5,
    farkliMekan: 5,
  };

  it("hiç rozeti yoksa hepsi yeni", () => {
    expect(yeniRozetler(ozet, [])).toEqual(["ilkAdim", "kahveGurmesi"]);
  });

  it("zaten kazanılanı tekrar vermez", () => {
    // "Tebrikler" ekranı her ziyarette çıkmamalı.
    expect(yeniRozetler(ozet, ["ilkAdim"])).toEqual(["kahveGurmesi"]);
  });

  it("hepsi kazanılmışsa boş döner", () => {
    expect(yeniRozetler(ozet, ["ilkAdim", "kahveGurmesi"])).toEqual([]);
  });

  it("tanınmayan bir rozet kaydı hesabı bozmaz", () => {
    // Veritabanında kaldırılmış bir rozet adı varsa (ör. tatliAvcisi)
    // yeni rozet hesabı yine doğru çalışmalı.
    expect(yeniRozetler(ozet, ["tatliAvcisi"])).toEqual([
      "ilkAdim",
      "kahveGurmesi",
    ]);
  });
});

describe("seviye", () => {
  it("sıfır puan 1. seviye", () => {
    expect(seviye(0)).toBe(1);
  });

  it("eşiklerde yükseliyor", () => {
    expect(seviye(99)).toBe(1);
    expect(seviye(100)).toBe(2);
    expect(seviye(300)).toBe(3);
    expect(seviye(3000)).toBe(6);
  });

  it("en üst seviyenin üstünde sabit kalır", () => {
    expect(seviye(999_999)).toBe(6);
  });

  it("bir sonraki seviyeye kalan puan", () => {
    expect(sonrakiSeviyeyeKalan(0)).toBe(100);
    expect(sonrakiSeviyeyeKalan(250)).toBe(50);
  });

  it("en üst seviyede kalan puan null", () => {
    expect(sonrakiSeviyeyeKalan(5000)).toBeNull();
  });
});

describe("rozet tanımları", () => {
  it("her rozetin adı, açıklaması ve puanı var", () => {
    for (const anahtar of ROZET_ANAHTARLARI) {
      const r = ROZETLER[anahtar];
      expect(r.ad.length).toBeGreaterThan(2);
      expect(r.aciklama.length).toBeGreaterThan(10);
      expect(r.puan).toBeGreaterThan(0);
    }
  });

  it("kaldırılan rozet geçerli sayılmıyor", () => {
    expect(gecerliRozetMi("tatliAvcisi")).toBe(false);
    expect(gecerliRozetMi("ilkAdim")).toBe(true);
  });

  it("her rozet gerçekten kazanılabilir", () => {
    // Kazanılamayan bir rozet profilde sonsuza kadar soluk durur;
    // bu test onu baştan yakalar.
    const doygun: ZiyaretOzeti = {
      toplamZiyaret: 100,
      farkliMekan: 100,
      canliMuzikMekani: 100,
      enCokZiyaretEdilenMekan: 100,
    };
    expect(hakEdilenRozetler(doygun).sort()).toEqual(
      [...ROZET_ANAHTARLARI].sort(),
    );
  });
});
