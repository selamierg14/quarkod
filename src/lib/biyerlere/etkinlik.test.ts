import { describe, expect, it } from "vitest";
import {
  EN_COK_ACIK_ETKINLIK,
  EN_ERKEN_DAKIKA,
  EN_GEC_GUN,
  ETKINLIK_ACMA_ROZETLERI,
  basladiMi,
  baslangicCoz,
  etkinlikAcabilirMi,
  listeAltSiniri,
} from "./etkinlik";

/**
 * Kullanıcı etkinliklerinin kapıları.
 *
 * Bu, projedeki tek kullanıcı-üretimi yayın yüzeyi: bir mekanın adının
 * yanında duran, o mekanın yazmadığı bir metin. Kapılardan birinin
 * sessizce gevşemesi, kötüye kullanımın bedelini içeriği yazana değil
 * adı geçen işletmeye ödetiyor. Testler bu yüzden her kapıyı ayrı ayrı
 * zorluyor.
 */

const SIMDI = new Date("2026-09-16T12:00:00Z");
const sonra = (dakika: number) =>
  new Date(SIMDI.getTime() + dakika * 60_000).toISOString();

describe("rozet kapısı", () => {
  it("rozeti olmayan etkinlik AÇAMIYOR", () => {
    const karar = etkinlikAcabilirMi([], 0);
    expect(karar.izin).toBe(false);
    if (!karar.izin) expect(karar.sebep).toBe("rozetYok");
  });

  it('"ilkAdim" tek başına YETMİYOR', () => {
    /**
     * Testin en önemli maddesi. İlk Adım tek ziyaretle kazanılıyor; eşik
     * saysaydık, bir kez karekod okutan sahte hesap mekan adına çağrı
     * yapabilirdi — kapının var olma sebebi tam olarak bu.
     */
    expect(ETKINLIK_ACMA_ROZETLERI).not.toContain("ilkAdim");
    expect(etkinlikAcabilirMi(["ilkAdim"], 0).izin).toBe(false);
  });

  it("kabul edilen rozetlerden biri yetiyor", () => {
    for (const rozet of ETKINLIK_ACMA_ROZETLERI) {
      expect(etkinlikAcabilirMi([rozet], 0).izin, rozet).toBe(true);
    }
  });

  it("tanınmayan rozet adı kapıyı açmıyor", () => {
    // Veritabanındaki `rozet` alanı düz metin; eski ya da uydurma bir
    // anahtar listeye sızarsa kapı kendiliğinden açılmamalı.
    expect(etkinlikAcabilirMi(["uydurmaRozet", "admin"], 0).izin).toBe(false);
  });
});

describe("açık etkinlik sayısı sınırı", () => {
  it("sınıra ulaşan yeni etkinlik açamıyor", () => {
    const karar = etkinlikAcabilirMi(["ustaKasif"], EN_COK_ACIK_ETKINLIK);
    expect(karar.izin).toBe(false);
    if (!karar.izin) {
      expect(karar.sebep).toBe("sinirDoldu");
      // Mesaj ne yapması gerektiğini söylüyor; "yetkiniz yok" demiyor.
      expect(karar.mesaj).toContain("iptal");
    }
  });

  it("sınırın bir altı hâlâ açabiliyor", () => {
    expect(etkinlikAcabilirMi(["ustaKasif"], EN_COK_ACIK_ETKINLIK - 1).izin).toBe(true);
  });

  it("rozet yokluğu sayı sınırından ÖNCE söyleniyor", () => {
    // İkisi birden hatalıysa kullanıcıya asıl engeli söylemek gerekiyor:
    // "3 etkinliğin açık" demek, hiç açamayacak birine yanlış yol tarifi.
    const karar = etkinlikAcabilirMi([], 99);
    if (!karar.izin) expect(karar.sebep).toBe("rozetYok");
  });
});

describe("zaman penceresi", () => {
  it("geçmiş tarih reddediliyor", () => {
    expect(baslangicCoz(sonra(-60), SIMDI).ok).toBe(false);
  });

  it("çok yakın tarih reddediliyor", () => {
    // "5 dakika sonra buluşuyoruz" diyen etkinliği kimse göremez;
    // liste yenilenene kadar zaten geçmiş olur.
    expect(baslangicCoz(sonra(EN_ERKEN_DAKIKA - 1), SIMDI).ok).toBe(false);
    expect(baslangicCoz(sonra(EN_ERKEN_DAKIKA + 1), SIMDI).ok).toBe(true);
  });

  it("çok uzak tarih reddediliyor", () => {
    expect(baslangicCoz(sonra(EN_GEC_GUN * 24 * 60 + 60), SIMDI).ok).toBe(false);
    expect(baslangicCoz(sonra(EN_GEC_GUN * 24 * 60 - 60), SIMDI).ok).toBe(true);
  });

  it("bozuk girdi istisna fırlatmıyor, hata mesajı veriyor", () => {
    // Gövde istemciden geliyor; `new Date("abc")` sessizce Invalid Date
    // üretiyor ve veritabanına kadar giderse 500'e dönüşüyordu.
    for (const ham of ["", "abc", "2026-13-45", null, 42, {}]) {
      const sonuc = baslangicCoz(ham, SIMDI);
      expect(sonuc.ok, String(ham)).toBe(false);
      if (!sonuc.ok) expect(sonuc.hata.length).toBeGreaterThan(0);
    }
  });
});

describe("listede kalma payı", () => {
  it("başlamış ama bitmemiş etkinlik listeden düşmüyor", () => {
    /**
     * "20:00'de buluşuyoruz" diyen bir etkinlik 20:05'te listeden
     * düşerse, yolda olan kullanıcı detayına bakamaz hâle geliyor.
     */
    const altSinir = listeAltSiniri(SIMDI);
    const birSaatOnce = new Date(SIMDI.getTime() - 60 * 60_000);
    expect(birSaatOnce.getTime()).toBeGreaterThan(altSinir.getTime());
  });

  it("çok eski etkinlik alt sınırın dışında kalıyor", () => {
    const dunku = new Date(SIMDI.getTime() - 24 * 60 * 60_000);
    expect(dunku.getTime()).toBeLessThan(listeAltSiniri(SIMDI).getTime());
  });

  it("başladı mı ayrımı sınırda doğru", () => {
    expect(basladiMi(SIMDI, SIMDI)).toBe(true);
    expect(basladiMi(new Date(SIMDI.getTime() + 1000), SIMDI)).toBe(false);
  });
});
