import { describe, expect, it } from "vitest";
import { degistirmeHedefi } from "./kurtarma-numarasi";

/**
 * Oturum içi şifre değiştirmede kodun nereye gideceği.
 *
 * Buradaki tek bir gevşeme doğrudan hesap devralmaya açılıyor: kod
 * saldırganın telefonuna giderse "mevcut şifreyi bil + SMS kodunu bil"
 * şartı tek faktöre iniyor ve oturumu ele geçiren kişi hesabı kalıcı
 * olarak devralıyor. Testlerin çoğu bu tek cümlenin farklı halleri.
 */

const DOGRULANDI = new Date("2026-01-01T00:00:00Z");

describe("kayıtlı doğrulanmış numara varken", () => {
  const kullanici = { telefon: "+905551112233", telefonDogrulandi: DOGRULANDI };

  it("kod KAYITLI numaraya gidiyor", () => {
    expect(degistirmeHedefi(kullanici, "")).toEqual({
      durum: "kayitli",
      telefon: "+905551112233",
    });
  });

  it("İSTEKTEKİ numara yok sayılıyor — testin asıl maddesi", () => {
    /**
     * Çalınmış bir oturum, gövdeye kendi numarasını koyup kodu kendine
     * yönlendirmeye çalışır. Sonuç kayıtlı numara olmak ZORUNDA.
     */
    const hedef = degistirmeHedefi(kullanici, "0532 999 88 77");
    expect(hedef).toEqual({ durum: "kayitli", telefon: "+905551112233" });
  });

  it("numara ikinci adımda da değiştirilemiyor", () => {
    // PUT aynı fonksiyonu çağırıyor; "yeni" dönmediği sürece `telefon`
    // alanı hiç yazılmıyor.
    expect(degistirmeHedefi(kullanici, "+905559998877").durum).not.toBe("yeni");
  });
});

describe("numara yokken", () => {
  const bos = { telefon: null, telefonDogrulandi: null };

  it("istekteki numara kabul ediliyor — kullanıcı ilk kez ekliyor", () => {
    expect(degistirmeHedefi(bos, "0532 123 45 67")).toEqual({
      durum: "yeni",
      telefon: "+905321234567",
    });
  });

  it("geçersiz numara reddediliyor", () => {
    expect(degistirmeHedefi(bos, "").durum).toBe("numaraYok");
    expect(degistirmeHedefi(bos, "abc").durum).toBe("numaraYok");
    // Sabit hatlı numara cep değil.
    expect(degistirmeHedefi(bos, "0212 123 45 67").durum).toBe("numaraYok");
  });
});

describe("numara var ama DOĞRULANMAMIŞ", () => {
  /**
   * Doğrulanmamış numara kayıtlı sayılmıyor: yazım hatası varsa kod
   * kullanıcıya hiç ulaşmaz, numara yanlışlıkla başkasınınsa o kişiye
   * ulaşır. İki durumda da "doğrulanmış" muamelesi yapılamaz.
   */
  const dogrulanmamis = { telefon: "+905551112233", telefonDogrulandi: null };

  it("kayıtlı sayılmıyor; istekteki numara yeni olarak alınıyor", () => {
    expect(degistirmeHedefi(dogrulanmamis, "0532 123 45 67")).toEqual({
      durum: "yeni",
      telefon: "+905321234567",
    });
  });

  it("istekte numara yoksa akış duruyor", () => {
    expect(degistirmeHedefi(dogrulanmamis, "").durum).toBe("numaraYok");
  });
});

describe("bozuk kayıtlı veri", () => {
  it("okunamayan kayıtlı numarada istekteki numaraya DÜŞÜLMÜYOR", () => {
    /**
     * `telefonDogrulandi` dolu ama `telefon` normalleştirilemiyor (eski
     * veri, elle düzenlenmiş kayıt). Bu durumda istekteki numarayı kabul
     * etmek, "doğrulanmış" sayılan bir numaranın yerine istemcinin
     * verdiğini koymak olurdu — engellenmek istenen şeyin ta kendisi.
     */
    const bozuk = { telefon: "bozuk-kayit", telefonDogrulandi: DOGRULANDI };
    expect(degistirmeHedefi(bozuk, "0532 123 45 67").durum).toBe("numaraYok");
  });
});
