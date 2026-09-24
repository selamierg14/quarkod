import { describe, expect, it } from "vitest";
import { eslenenUrunAdlari, sablonUrunBilgisi } from "./menu-sablon-bilgileri";
import { MENU_SABLONLARI } from "./menu-sablonlari";
import { isAlerjen, isOzelBilesen } from "./menu";

/**
 * Şablonların taşıdığı tipik menü bilgileri.
 *
 * Bu dosyadaki bir kırmızı, bir işletmenin şablon uygulayıp yanlış ya da
 * eksik bir alerjen beyanı yayımlaması demek olabilir.
 */
describe("şablon ürün bilgileri", () => {
  it("her şablon ürününün bir eşlemesi var", () => {
    // Yeni bir ürün eklendiğinde eşlemesi unutulursa burası kırmızı yanar;
    // aksi halde o ürün sessizce bilgisiz kalırdı.
    const eksik: string[] = [];
    for (const sablon of MENU_SABLONLARI) {
      for (const kategori of sablon.kategoriler) {
        for (const urun of kategori.urunler) {
          if (!sablonUrunBilgisi(urun.ad)) eksik.push(`${sablon.id}/${urun.ad}`);
        }
      }
    }
    expect(eksik).toEqual([]);
  });

  it("bütün alerjen ve özel bileşen anahtarları geçerli", () => {
    for (const ad of eslenenUrunAdlari()) {
      const bilgi = sablonUrunBilgisi(ad)!;
      for (const a of bilgi.alerjenler) expect(isAlerjen(a), `${ad}: ${a}`).toBe(true);
      for (const o of bilgi.ozelBilesenler ?? []) {
        expect(isOzelBilesen(o), `${ad}: ${o}`).toBe(true);
      }
    }
  });

  it("kalori değerleri makul aralıkta", () => {
    for (const ad of eslenenUrunAdlari()) {
      const { kaloriKcal } = sablonUrunBilgisi(ad)!;
      expect(kaloriKcal, ad).toBeGreaterThanOrEqual(0);
      expect(kaloriKcal, ad).toBeLessThan(2000);
    }
  });

  it("her üründe temel bileşen metni dolu", () => {
    for (const ad of eslenenUrunAdlari()) {
      expect(sablonUrunBilgisi(ad)!.icindekiler.length, ad).toBeGreaterThan(3);
    }
  });

  describe("sık atlanan beyanlar", () => {
    it("bira gluten içerir (arpa maltı)", () => {
      // Biranın glutenini atlamak en yaygın hatalardan biri.
      expect(sablonUrunBilgisi("Bira")!.alerjenler).toContain("gluten");
      expect(sablonUrunBilgisi("Fıçı Bira (50 cl)")!.alerjenler).toContain("gluten");
    });

    it("alkollü içecekler özel bileşen olarak işaretli", () => {
      for (const ad of ["Bira", "Rakı (Tek)", "Mojito", "Şarap (Şişe)"]) {
        expect(sablonUrunBilgisi(ad)!.ozelBilesenler, ad).toContain("alkol");
      }
    });

    it("alkolsüz kokteyl alkol taşımaz", () => {
      expect(sablonUrunBilgisi("Virgin Mojito")!.ozelBilesenler ?? []).not.toContain("alkol");
    });

    it("şarap sülfit içerir", () => {
      expect(sablonUrunBilgisi("Kırmızı Şarap (Kadeh)")!.alerjenler).toContain("sulfit");
    });

    it("humus susam içerir (tahin)", () => {
      expect(sablonUrunBilgisi("Humus")!.alerjenler).toContain("susam");
    });

    it("sezar salata gizli balık (ançüez) taşır", () => {
      expect(sablonUrunBilgisi("Sezar Salata")!.alerjenler).toContain("balik");
    });

    it("su hiçbir alerjen taşımaz", () => {
      expect(sablonUrunBilgisi("Su (0.5 lt)")!.alerjenler).toEqual([]);
      expect(sablonUrunBilgisi("Su (0.5 lt)")!.kaloriKcal).toBe(0);
    });

    it("burger susamlı ekmek nedeniyle susam taşır", () => {
      expect(sablonUrunBilgisi("Cheeseburger")!.alerjenler).toContain("susam");
    });
  });
});
