import { describe, expect, it } from "vitest";
import {
  TEMIZLIK_PAYI_DAKIKA,
  araliklarCakisiyorMu,
  cakismaBul,
  kapasiteYeterliMi,
  masaDurumu,
  masayiMesgulEderMi,
  planKonumuKirp,
  rezervasyonDogrula,
  type MevcutRezervasyon,
} from "./rezervasyon";

/** 9 Eylül 2026, saat bazlı kısa yazım. */
function t(saat: number, dakika = 0): Date {
  return new Date(2026, 8, 9, saat, dakika, 0, 0);
}

function rez(
  id: string,
  bas: Date,
  bit: Date,
  masaIdleri: string[],
  durum = "onaylandi",
): MevcutRezervasyon {
  return { id, baslangic: bas, bitis: bit, durum, masaIdleri };
}

describe("araliklarCakisiyorMu", () => {
  it("iç içe aralıklar çakışır", () => {
    expect(
      araliklarCakisiyorMu(
        { baslangic: t(19), bitis: t(21) },
        { baslangic: t(20), bitis: t(20, 30) },
      ),
    ).toBe(true);
  });

  /**
   * Yarı açık aralığın asıl sebebi: arka arkaya iki oturum mümkün
   * olmalı. Kapalı aralık olsaydı 21:00'de biten rezervasyon 21:00'de
   * başlayanı engellerdi.
   */
  it("uç uca aralıklar çakışmaz", () => {
    expect(
      araliklarCakisiyorMu(
        { baslangic: t(19), bitis: t(21) },
        { baslangic: t(21), bitis: t(23) },
      ),
    ).toBe(false);
  });

  it("tamamen ayrık aralıklar çakışmaz", () => {
    expect(
      araliklarCakisiyorMu(
        { baslangic: t(12), bitis: t(14) },
        { baslangic: t(19), bitis: t(21) },
      ),
    ).toBe(false);
  });
});

describe("cakismaBul", () => {
  const mevcutlar = [rez("r1", t(19), t(21), ["m1"])];

  it("aynı masada çakışan saati yakalar", () => {
    const sonuc = cakismaBul(
      { baslangic: t(20), bitis: t(22), masaIdleri: ["m1"] },
      mevcutlar,
    );
    expect(sonuc.cakisiyor).toBe(true);
    expect(sonuc.catismalar[0]).toMatchObject({ rezervasyonId: "r1", masaIdleri: ["m1"] });
  });

  it("farklı masada aynı saat çakışmaz", () => {
    expect(
      cakismaBul({ baslangic: t(20), bitis: t(22), masaIdleri: ["m2"] }, mevcutlar).cakisiyor,
    ).toBe(false);
  });

  /** Temizlik payı: 21:00'de biten kaydın hemen ardına 21:00 alınamaz. */
  it("temizlik payı içindeki bitişik kaydı engeller", () => {
    expect(
      cakismaBul({ baslangic: t(21), bitis: t(23), masaIdleri: ["m1"] }, mevcutlar).cakisiyor,
    ).toBe(true);
    // Pay kadar sonrası serbest.
    expect(
      cakismaBul(
        { baslangic: t(21, TEMIZLIK_PAYI_DAKIKA), bitis: t(23), masaIdleri: ["m1"] },
        mevcutlar,
      ).cakisiyor,
    ).toBe(false);
  });

  it("payı sıfırlayınca uç uca kayıt serbest kalır", () => {
    expect(
      cakismaBul({ baslangic: t(21), bitis: t(23), masaIdleri: ["m1"] }, mevcutlar, {
        payDakika: 0,
      }).cakisiyor,
    ).toBe(false);
  });

  it("iptal ve gelmedi masayı serbest bırakır", () => {
    for (const durum of ["iptal", "gelmedi"]) {
      const sonuc = cakismaBul(
        { baslangic: t(20), bitis: t(22), masaIdleri: ["m1"] },
        [rez("r1", t(19), t(21), ["m1"], durum)],
      );
      expect(sonuc.cakisiyor, `${durum} engellememeli`).toBe(false);
    }
  });

  it("bekliyor ve oturdu masayı meşgul eder", () => {
    for (const durum of ["bekliyor", "oturdu"]) {
      const sonuc = cakismaBul(
        { baslangic: t(20), bitis: t(22), masaIdleri: ["m1"] },
        [rez("r1", t(19), t(21), ["m1"], durum)],
      );
      expect(sonuc.cakisiyor, `${durum} engellemeli`).toBe(true);
    }
  });

  /** Kayıt düzenlenirken kendi kendisiyle çakışmamalı. */
  it("hariç tutulan kayıt kendisiyle çakışmaz", () => {
    expect(
      cakismaBul({ baslangic: t(19, 30), bitis: t(21), masaIdleri: ["m1"] }, mevcutlar, {
        haricRezervasyonId: "r1",
      }).cakisiyor,
    ).toBe(false);
  });

  /** Masa birleştirme: iki masadan biri doluysa birleşik kayıt açılamaz. */
  it("birleştirilen masalardan biri doluysa engeller", () => {
    const sonuc = cakismaBul(
      { baslangic: t(20), bitis: t(22), masaIdleri: ["m1", "m2"] },
      mevcutlar,
    );
    expect(sonuc.cakisiyor).toBe(true);
    expect(sonuc.catismalar[0].masaIdleri).toEqual(["m1"]);
  });
});

describe("masaDurumu", () => {
  const acik = { aktif: true };

  it("rezervasyonu olmayan masa boş", () => {
    expect(masaDurumu(acik, [], t(20))).toBe("bos");
  });

  it("o an oturulan masa dolu", () => {
    expect(masaDurumu(acik, [rez("r", t(19), t(21), ["m1"])], t(20))).toBe("dolu");
  });

  it("bir saat içinde rezervasyonu olan masa yaklaşan", () => {
    expect(masaDurumu(acik, [rez("r", t(20, 30), t(22), ["m1"])], t(20))).toBe("yaklasan");
  });

  it("uzak rezervasyon masayı boş bırakır", () => {
    expect(masaDurumu(acik, [rez("r", t(23), t(23, 59), ["m1"])], t(20))).toBe("bos");
  });

  it("kapalı masa her koşulda kapalı", () => {
    expect(masaDurumu({ aktif: false }, [rez("r", t(19), t(21), ["m1"])], t(20))).toBe("kapali");
  });

  /**
   * Öncelik sırası: üstünde müşteri oturan masa, birazdan başka bir
   * rezervasyonu olsa bile "dolu" görünmeli.
   */
  it("dolu masa, yaklaşan rezervasyonu olsa da dolu kalır", () => {
    const durum = masaDurumu(
      acik,
      [rez("r1", t(19), t(20, 30), ["m1"]), rez("r2", t(20, 45), t(22), ["m1"])],
      t(20),
    );
    expect(durum).toBe("dolu");
  });

  it("iptal edilmiş rezervasyon masayı doldurmaz", () => {
    expect(masaDurumu(acik, [rez("r", t(19), t(21), ["m1"], "iptal")], t(20))).toBe("bos");
  });
});

describe("kapasiteYeterliMi", () => {
  it("tek masa yetiyorsa uygun", () => {
    expect(kapasiteYeterliMi([{ kapasite: 4 }], 4)).toEqual({ uygun: true, toplamKapasite: 4 });
  });

  /** Masa birleştirmenin sayısal karşılığı. */
  it("iki masa birleşince kapasite toplanır", () => {
    expect(kapasiteYeterliMi([{ kapasite: 4 }, { kapasite: 4 }], 8)).toEqual({
      uygun: true,
      toplamKapasite: 8,
    });
  });

  it("yetmeyince eksiği söyler", () => {
    expect(kapasiteYeterliMi([{ kapasite: 2 }], 5)).toEqual({
      uygun: false,
      toplamKapasite: 2,
      eksik: 3,
    });
  });
});

describe("rezervasyonDogrula", () => {
  const gecerli = {
    misafirAdi: "Ayşe Yılmaz",
    kisiSayisi: 4,
    baslangic: t(19),
    bitis: t(21),
    masaIdleri: ["m1"],
  };

  it("geçerli girdide hata yok", () => {
    expect(rezervasyonDogrula(gecerli)).toEqual([]);
  });

  it("boş isim reddedilir", () => {
    const hatalar = rezervasyonDogrula({ ...gecerli, misafirAdi: "  " });
    expect(hatalar.map((h) => h.alan)).toContain("misafirAdi");
  });

  it("masasız rezervasyon reddedilir", () => {
    expect(rezervasyonDogrula({ ...gecerli, masaIdleri: [] }).map((h) => h.alan)).toContain(
      "masalar",
    );
  });

  it("ters zaman aralığı reddedilir", () => {
    expect(
      rezervasyonDogrula({ ...gecerli, baslangic: t(21), bitis: t(19) }).map((h) => h.alan),
    ).toContain("bitis");
  });

  it("12 saati aşan aralık reddedilir", () => {
    expect(
      rezervasyonDogrula({ ...gecerli, baslangic: t(9), bitis: new Date(2026, 8, 10, 0) }).map(
        (h) => h.alan,
      ),
    ).toContain("bitis");
  });

  it("sıfır kişilik rezervasyon reddedilir", () => {
    expect(rezervasyonDogrula({ ...gecerli, kisiSayisi: 0 }).map((h) => h.alan)).toContain(
      "kisiSayisi",
    );
  });
});

describe("masayiMesgulEderMi", () => {
  it("bilinmeyen durum masayı meşgul etmez", () => {
    expect(masayiMesgulEderMi("uydurma")).toBe(false);
  });
});

describe("planKonumuKirp", () => {
  it("0-100 aralığına sıkıştırır", () => {
    expect(planKonumuKirp(-10)).toBe(0);
    expect(planKonumuKirp(150)).toBe(100);
    expect(planKonumuKirp(42.129)).toBe(42.13);
  });

  it("sayı olmayan değerde sıfıra düşer", () => {
    expect(planKonumuKirp(Number.NaN)).toBe(0);
  });
});
