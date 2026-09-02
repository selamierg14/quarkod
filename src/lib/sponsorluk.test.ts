import { describe, expect, it } from "vitest";
import { ayniHaftaMi, sponsorMu } from "./sponsorluk";

/**
 * Sponsor bannerı kuralı: yalnızca İÇİNDE BULUNULAN haftanın sponsoru
 * hero'da çıkmalı. Bir hata burada ya geçen haftanın sponsorunu sonsuza
 * kadar göstermeye devam eder ya da gelecek için zamanlanmış bir sponsoru
 * erken gösterir.
 */
describe("ayniHaftaMi", () => {
  it("aynı haftanın pazartesi ve cumasını aynı sayar", () => {
    expect(ayniHaftaMi(new Date(2026, 8, 1), new Date(2026, 8, 4))).toBe(true);
  });

  it("bir sonraki haftanın pazartesisini farklı sayar", () => {
    expect(ayniHaftaMi(new Date(2026, 8, 1), new Date(2026, 8, 8))).toBe(false);
  });

  it("yıl sınırını doğru geçer", () => {
    // 2026-12-28 Pazartesi ile 2027-01-01 Cuma aynı hafta.
    expect(ayniHaftaMi(new Date(2026, 11, 28), new Date(2027, 0, 1))).toBe(true);
  });
});

describe("sponsorMu", () => {
  it("sponsorHaftasi boşsa false", () => {
    expect(sponsorMu(null, new Date(2026, 8, 2))).toBe(false);
  });

  it("bu haftaya denk gelen sponsor true", () => {
    expect(sponsorMu(new Date(2026, 8, 1), new Date(2026, 8, 3))).toBe(true);
  });

  it("geçmiş haftanın sponsoru artık false", () => {
    expect(sponsorMu(new Date(2026, 7, 24), new Date(2026, 8, 3))).toBe(false);
  });

  it("gelecek için zamanlanmış sponsor o hafta gelmeden false", () => {
    expect(sponsorMu(new Date(2026, 8, 15), new Date(2026, 8, 3))).toBe(false);
  });
});
