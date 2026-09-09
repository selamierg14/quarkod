import { describe, expect, it } from "vitest";
import { googleYorumLinkiGecerliMi, googleYorumLinkiSorunu } from "./google-yorum";

describe("googleYorumLinkiGecerliMi", () => {
  it("gerçek yorum linklerini kabul eder", () => {
    expect(
      googleYorumLinkiGecerliMi(
        "https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4",
      ),
    ).toBe(true);
    expect(googleYorumLinkiGecerliMi("https://g.page/r/CQq6abc/review")).toBe(true);
    expect(
      googleYorumLinkiGecerliMi(
        "https://www.google.com/maps/place/KESKIN+LEZZETLER/@40.87,29.23,17z",
      ),
    ).toBe(true);
  });

  it("kurulumdan kalan yer tutucuyu reddeder", () => {
    // Canlıda iki işletmede tam olarak bu duruyordu.
    expect(
      googleYorumLinkiGecerliMi(
        "https://search.google.com/local/writereview?placeid=DEGISTIRIN",
      ),
    ).toBe(false);
    expect(
      googleYorumLinkiGecerliMi("https://search.google.com/local/writereview?placeid=xxx"),
    ).toBe(false);
  });

  it("boş placeid'yi reddeder", () => {
    expect(
      googleYorumLinkiGecerliMi("https://search.google.com/local/writereview?placeid="),
    ).toBe(false);
  });

  it("Google dışı adresleri reddeder", () => {
    expect(googleYorumLinkiGecerliMi("https://yelp.com/biz/kafe")).toBe(false);
    expect(googleYorumLinkiGecerliMi("https://google.evil.com/review")).toBe(false);
  });

  it("bozuk ya da boş girdiyi reddeder", () => {
    expect(googleYorumLinkiGecerliMi("")).toBe(false);
    expect(googleYorumLinkiGecerliMi(null)).toBe(false);
    expect(googleYorumLinkiGecerliMi("google.com/maps")).toBe(false);
    expect(googleYorumLinkiGecerliMi("javascript:alert(1)")).toBe(false);
  });
});

describe("googleYorumLinkiSorunu", () => {
  it("boş linkle geçersiz linki ayırt eder", () => {
    expect(googleYorumLinkiSorunu(null)).toContain("yok");
    expect(
      googleYorumLinkiSorunu("https://search.google.com/local/writereview?placeid=DEGISTIRIN"),
    ).toContain("geçersiz");
    expect(
      googleYorumLinkiSorunu("https://g.page/r/CQq6abc/review"),
    ).toBeNull();
  });
});
