import { describe, expect, it } from "vitest";
import { davetKoduBicimiGecerliMi, davetKoduUret } from "./davet";

describe("davetKoduUret", () => {
  it("6 karakterlik bir kod üretir", () => {
    expect(davetKoduUret()).toHaveLength(6);
  });

  it("üretilen kod kendi biçim kontrolünü geçer", () => {
    // Üretici ile doğrulayıcı aynı alfabeden beslenmiyor olsaydı bir
    // kullanıcı kendi kodunu paylaşıp sistemin reddetmesiyle karşılaşabilirdi.
    for (let i = 0; i < 20; i++) {
      expect(davetKoduBicimiGecerliMi(davetKoduUret())).toBe(true);
    }
  });

  it("karışabilecek karakterleri (0, O, 1, I) hiç üretmez", () => {
    for (let i = 0; i < 50; i++) {
      const kod = davetKoduUret();
      expect(kod).not.toMatch(/[01OI]/);
    }
  });
});

describe("davetKoduBicimiGecerliMi", () => {
  it("küçük harfle girilen geçerli kodu kabul eder", () => {
    expect(davetKoduBicimiGecerliMi("ab234c".toLowerCase())).toBe(true);
  });

  it("yanlış uzunluğu reddeder", () => {
    expect(davetKoduBicimiGecerliMi("AB23")).toBe(false);
    expect(davetKoduBicimiGecerliMi("AB2345C")).toBe(false);
  });

  it("alfabede olmayan karakteri reddeder", () => {
    expect(davetKoduBicimiGecerliMi("AB23O5")).toBe(false); // O yasak
    expect(davetKoduBicimiGecerliMi("AB!@#$")).toBe(false);
  });

  it("baştaki/sondaki boşluğu görmezden gelir", () => {
    expect(davetKoduBicimiGecerliMi("  AB2345  ".trim())).toBe(true);
  });
});
