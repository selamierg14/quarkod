import { describe, expect, it } from "vitest";
import {
  EN_UZAK_MESAFE_METRE,
  ZIYARET_BEKLEME_SAATI,
  redMesaji,
  ziyaretKarari,
} from "./ziyaret";

/**
 * Doğrulanmış ziyaret kuralları.
 *
 * Biyerlere'nin en değerli iddiası "sahte yorum yok" ve bu dosya o
 * iddianın tamamını taşıyor. İki yönde de hata pahalı: gevşek olursa
 * evden puan toplanır, sıkı olursa masasında oturan gerçek müşteri puan
 * alamaz.
 */
const MEKAN = { enlem: 40.8715146, boylam: 29.2329381 };
const SIMDI = new Date("2026-08-30T20:00:00Z");

/** Mekandan yaklaşık `metre` kadar kuzeydeki nokta. */
function kuzeyde(metre: number) {
  return { enlem: MEKAN.enlem + metre / 111_320, boylam: MEKAN.boylam };
}

describe("konum doğrulaması", () => {
  it("masadaki müşteriyi kabul eder", () => {
    const karar = ziyaretKarari({
      kullaniciKonumu: kuzeyde(15),
      mekanKonumu: MEKAN,
      sonZiyaret: null,
      simdi: SIMDI,
    });
    expect(karar.kabul).toBe(true);
    expect(karar.mesafeMetre).toBeLessThan(EN_UZAK_MESAFE_METRE);
  });

  it("eşiğin hemen içindekini kabul eder", () => {
    const karar = ziyaretKarari({
      kullaniciKonumu: kuzeyde(90),
      mekanKonumu: MEKAN,
      sonZiyaret: null,
      simdi: SIMDI,
    });
    expect(karar.kabul).toBe(true);
  });

  it("uzaktakini reddeder", () => {
    // Evden ya da karşı sokaktan puan verme denemesi.
    const karar = ziyaretKarari({
      kullaniciKonumu: kuzeyde(500),
      mekanKonumu: MEKAN,
      sonZiyaret: null,
      simdi: SIMDI,
    });
    expect(karar).toMatchObject({ kabul: false, neden: "uzakta" });
  });

  it("konum verilmediyse reddeder ve mesafe uydurmaz", () => {
    const karar = ziyaretKarari({
      kullaniciKonumu: null,
      mekanKonumu: MEKAN,
      sonZiyaret: null,
      simdi: SIMDI,
    });
    expect(karar).toEqual({
      kabul: false,
      neden: "konum-yok",
      mesafeMetre: null,
    });
  });

  it("mekanın konumu tanımlı değilse reddeder", () => {
    const karar = ziyaretKarari({
      kullaniciKonumu: kuzeyde(10),
      mekanKonumu: null,
      sonZiyaret: null,
      simdi: SIMDI,
    });
    expect(karar).toMatchObject({ kabul: false, neden: "mekan-konumsuz" });
  });
});

describe("bekleme süresi", () => {
  const masada = kuzeyde(10);

  it("arka arkaya okutmayı reddeder", () => {
    // Masada oturup puan biriktirme denemesi.
    const karar = ziyaretKarari({
      kullaniciKonumu: masada,
      mekanKonumu: MEKAN,
      sonZiyaret: new Date(SIMDI.getTime() - 5 * 60 * 1000),
      simdi: SIMDI,
    });
    expect(karar).toMatchObject({ kabul: false, neden: "cok-erken" });
  });

  it("bekleme dolmadan hemen önce hâlâ reddeder", () => {
    const karar = ziyaretKarari({
      kullaniciKonumu: masada,
      mekanKonumu: MEKAN,
      sonZiyaret: new Date(
        SIMDI.getTime() - (ZIYARET_BEKLEME_SAATI * 60 - 1) * 60 * 1000,
      ),
      simdi: SIMDI,
    });
    expect(karar.kabul).toBe(false);
  });

  it("bekleme dolunca kabul eder", () => {
    // Sabah kahvesi + akşam yemeği ayrı ziyaret sayılmalı.
    const karar = ziyaretKarari({
      kullaniciKonumu: masada,
      mekanKonumu: MEKAN,
      sonZiyaret: new Date(
        SIMDI.getTime() - (ZIYARET_BEKLEME_SAATI + 1) * 60 * 60 * 1000,
      ),
      simdi: SIMDI,
    });
    expect(karar.kabul).toBe(true);
  });

  it("bekleme içindeyken bile UZAKTAYSA sebep 'uzakta' olur", () => {
    // Kullanıcıya doğru sebebi söylemek önemli: mekandan uzaktayken
    // "biraz bekle" demek, beklerse olacağı izlenimi verirdi.
    const karar = ziyaretKarari({
      kullaniciKonumu: kuzeyde(500),
      mekanKonumu: MEKAN,
      sonZiyaret: new Date(SIMDI.getTime() - 60 * 1000),
      simdi: SIMDI,
    });
    expect(karar).toMatchObject({ kabul: false, neden: "uzakta" });
  });
});

describe("red mesajları", () => {
  it("her sebebin kullanıcıya gösterilebilir bir karşılığı var", () => {
    for (const neden of [
      "konum-yok",
      "mekan-konumsuz",
      "uzakta",
      "cok-erken",
    ] as const) {
      expect(redMesaji(neden).length).toBeGreaterThan(10);
    }
  });
});
