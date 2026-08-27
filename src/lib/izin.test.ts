import { describe, expect, it } from "vitest";
import {
  araliklarKesisiyorMu,
  gunleriAc,
  izinKumesiKur,
  izinliMi,
} from "./izin";

const g = (yil: number, ay: number, gun: number) => new Date(yil, ay - 1, gun);

describe("gün aralığını açma", () => {
  it("kapsayıcı aralığı gün gün açar", () => {
    expect(gunleriAc(g(2026, 8, 24), g(2026, 8, 26))).toEqual([
      "2026-08-24",
      "2026-08-25",
      "2026-08-26",
    ]);
  });

  it("tek günlük izinde tek gün döner", () => {
    expect(gunleriAc(g(2026, 8, 24), g(2026, 8, 24))).toEqual(["2026-08-24"]);
  });

  it("ay ve yıl sınırını doğru geçer", () => {
    expect(gunleriAc(g(2025, 12, 31), g(2026, 1, 2))).toEqual([
      "2025-12-31",
      "2026-01-01",
      "2026-01-02",
    ]);
  });

  it("ters aralıkta boş döner, sonsuz döngü kurmaz", () => {
    expect(gunleriAc(g(2026, 8, 26), g(2026, 8, 24))).toEqual([]);
  });

  it("saat bileşeni sonucu etkilemez", () => {
    // Kayıtlar gün başına sabitlense de dışarıdan saatli bir Date gelebilir.
    const bas = new Date(2026, 7, 24, 23, 45);
    const bit = new Date(2026, 7, 25, 1, 15);
    expect(gunleriAc(bas, bit)).toEqual(["2026-08-24", "2026-08-25"]);
  });
});

describe("izin kümesi", () => {
  it("onaylı izni gün gün işaretler", () => {
    const kume = izinKumesiKur([
      {
        userId: "u1",
        baslangic: g(2026, 8, 24),
        bitis: g(2026, 8, 25),
        tur: "yillik",
        status: "onaylandi",
      },
    ]);

    expect(izinliMi(kume, "u1", "2026-08-24")).toBe("yillik");
    expect(izinliMi(kume, "u1", "2026-08-25")).toBe("yillik");
    expect(izinliMi(kume, "u1", "2026-08-26")).toBeNull();
    expect(izinliMi(kume, "u2", "2026-08-24")).toBeNull();
  });

  it("bekleyen talebi izin saymaz", () => {
    // Henüz onaylanmamış bir talep taahhüt değil; çizelgeyi ona göre boş
    // bırakmak yöneticiyi yanıltır.
    const kume = izinKumesiKur([
      {
        userId: "u1",
        baslangic: g(2026, 8, 24),
        bitis: g(2026, 8, 24),
        tur: "yillik",
        status: "bekliyor",
      },
    ]);
    expect(izinliMi(kume, "u1", "2026-08-24")).toBeNull();
  });

  it("reddedilen talebi izin saymaz", () => {
    const kume = izinKumesiKur([
      {
        userId: "u1",
        baslangic: g(2026, 8, 24),
        bitis: g(2026, 8, 24),
        tur: "yillik",
        status: "reddedildi",
      },
    ]);
    expect(izinliMi(kume, "u1", "2026-08-24")).toBeNull();
  });

  it("izin türünü korur", () => {
    const kume = izinKumesiKur([
      {
        userId: "u1",
        baslangic: g(2026, 8, 24),
        bitis: g(2026, 8, 24),
        tur: "rapor",
        status: "onaylandi",
      },
      {
        userId: "u2",
        baslangic: g(2026, 8, 24),
        bitis: g(2026, 8, 24),
        tur: "musait_degil",
        status: "onaylandi",
      },
    ]);
    expect(izinliMi(kume, "u1", "2026-08-24")).toBe("rapor");
    expect(izinliMi(kume, "u2", "2026-08-24")).toBe("musait_degil");
  });

  it("tanınmayan türü yıllık izne düşürür", () => {
    // Elle/eski kayıt bozuksa gün yine izinli sayılmalı; tür etiketi
    // yüzünden uyarı tamamen kaybolmasın.
    const kume = izinKumesiKur([
      {
        userId: "u1",
        baslangic: g(2026, 8, 24),
        bitis: g(2026, 8, 24),
        tur: "bilinmeyen",
        status: "onaylandi",
      },
    ]);
    expect(izinliMi(kume, "u1", "2026-08-24")).toBe("yillik");
  });
});

describe("aralık kesişimi", () => {
  it("üst üste binen aralıkları yakalar", () => {
    expect(
      araliklarKesisiyorMu(g(2026, 8, 24), g(2026, 8, 28), g(2026, 8, 27), g(2026, 8, 30)),
    ).toBe(true);
  });

  it("uç uca değen aralıkları kesişmiş sayar", () => {
    // Kapsayıcı aralık: 24–26 ile 26–28 aynı günü paylaşıyor.
    expect(
      araliklarKesisiyorMu(g(2026, 8, 24), g(2026, 8, 26), g(2026, 8, 26), g(2026, 8, 28)),
    ).toBe(true);
  });

  it("ayrık aralıkları kesişmemiş sayar", () => {
    expect(
      araliklarKesisiyorMu(g(2026, 8, 24), g(2026, 8, 25), g(2026, 8, 26), g(2026, 8, 27)),
    ).toBe(false);
  });

  it("saat farkı kesişimi bozmaz", () => {
    expect(
      araliklarKesisiyorMu(
        new Date(2026, 7, 24, 22, 0),
        new Date(2026, 7, 24, 23, 0),
        new Date(2026, 7, 24, 1, 0),
        new Date(2026, 7, 24, 2, 0),
      ),
    ).toBe(true);
  });
});
