import { beforeAll, describe, expect, it } from "vitest";
import {
  PENCERE_SANIYE,
  guncelKupon,
  kuponKodu,
  kuponKoduGecerliMi,
  pencereNumarasi,
} from "./kupon-kod";

/**
 * Kasada okutulan dönen kupon kodu.
 *
 * Bu dosyadaki bir kırmızının iki karşılığı var: kod paylaşılabilir hale
 * gelirse tek kupon bir grupta kullanılır; fazla katı olursa müşteri
 * kasada sıra beklerken kodu ölür ve indirimi alamaz.
 */
beforeAll(() => {
  process.env.AUTH_SECRET ??= "test-icin-en-az-otuz-iki-karakterlik-gizli-anahtar";
});

const KUPON = "kupon-1";
const AN = new Date("2026-08-30T12:00:00Z");

describe("kod üretimi", () => {
  it("aynı kupon ve pencere için aynı kodu verir", () => {
    const p = pencereNumarasi(AN);
    expect(kuponKodu(KUPON, p)).toBe(kuponKodu(KUPON, p));
  });

  it("farklı kuponlar farklı kod alır", () => {
    const p = pencereNumarasi(AN);
    expect(kuponKodu(KUPON, p)).not.toBe(kuponKodu("kupon-2", p));
  });

  it("pencere ilerleyince kod değişir", () => {
    // Ekran görüntüsünün ömrünü sınırlayan asıl mekanizma bu.
    const p = pencereNumarasi(AN);
    expect(kuponKodu(KUPON, p)).not.toBe(kuponKodu(KUPON, p + 1));
  });

  it("kod 8 hane ve karışan karakter içermiyor", () => {
    // Kasada karekod okunamazsa garson elle girecek: 0/O ve 1/I ayrımı
    // telefonla söylenirken hata üretir, o yüzden alfabede yoklar.
    const kod = kuponKodu(KUPON, pencereNumarasi(AN));
    expect(kod).toMatch(/^[2-9A-HJ-NP-Z]{8}$/);
  });
});

describe("kalan süre", () => {
  it("pencere başında tam süre kalır", () => {
    const pencereBasi = new Date(pencereNumarasi(AN) * PENCERE_SANIYE * 1000);
    expect(guncelKupon(KUPON, pencereBasi).kalanSaniye).toBe(PENCERE_SANIYE);
  });

  it("kalan süre pencereyi aşmaz", () => {
    const { kalanSaniye } = guncelKupon(KUPON, AN);
    expect(kalanSaniye).toBeGreaterThan(0);
    expect(kalanSaniye).toBeLessThanOrEqual(PENCERE_SANIYE);
  });
});

describe("doğrulama", () => {
  it("güncel kodu kabul eder", () => {
    const { kod } = guncelKupon(KUPON, AN);
    expect(kuponKoduGecerliMi(KUPON, kod, AN)).toBe(true);
  });

  it("küçük harfle girilse de kabul eder", () => {
    // Garson elle girerken küçük harf yazabilir.
    const { kod } = guncelKupon(KUPON, AN);
    expect(kuponKoduGecerliMi(KUPON, kod.toLowerCase(), AN)).toBe(true);
  });

  it("baştaki/sondaki boşluğu tolere eder", () => {
    const { kod } = guncelKupon(KUPON, AN);
    expect(kuponKoduGecerliMi(KUPON, `  ${kod} `, AN)).toBe(true);
  });

  it("BİR ÖNCEKİ pencerenin kodunu da kabul eder", () => {
    // Müşteri kodu açıp kasaya yürürken pencere dönmüş olabilir; bu
    // tolerans olmasaydı sıra bekleyen müşteri indirimini kaybederdi.
    const oncekiKod = kuponKodu(KUPON, pencereNumarasi(AN) - 1);
    expect(kuponKoduGecerliMi(KUPON, oncekiKod, AN)).toBe(true);
  });

  it("İKİ pencere önceki kodu reddeder", () => {
    // Ekran görüntüsünün ömrü buraya kadar: en fazla ~30 dakika.
    const eskiKod = kuponKodu(KUPON, pencereNumarasi(AN) - 2);
    expect(kuponKoduGecerliMi(KUPON, eskiKod, AN)).toBe(false);
  });

  it("başka kuponun kodunu reddeder", () => {
    const { kod } = guncelKupon("kupon-2", AN);
    expect(kuponKoduGecerliMi(KUPON, kod, AN)).toBe(false);
  });

  it("uydurma kodu reddeder", () => {
    expect(kuponKoduGecerliMi(KUPON, "ABCD2345", AN)).toBe(false);
    expect(kuponKoduGecerliMi(KUPON, "", AN)).toBe(false);
    expect(kuponKoduGecerliMi(KUPON, "KISA", AN)).toBe(false);
    expect(kuponKoduGecerliMi(KUPON, "COKUZUNBIRKOD", AN)).toBe(false);
  });

  it("gelecekteki pencerenin kodunu reddeder", () => {
    // İleri saate kurulmuş bir cihazdan kod üretilemesin.
    const ileriKod = kuponKodu(KUPON, pencereNumarasi(AN) + 1);
    expect(kuponKoduGecerliMi(KUPON, ileriKod, AN)).toBe(false);
  });
});
