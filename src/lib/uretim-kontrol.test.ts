import { describe, expect, it } from "vitest";
import { uretimSorunlari, type Ayarlar } from "./uretim-kontrol";

/**
 * Bu testlerin her biri, canlıda sessizce yanlış çalışan bir sistemi temsil
 * ediyor. Kırmızıya dönmeleri değil, buradaki kuralın gevşetilmesi tehlikeli.
 */

const saglam: Ayarlar = {
  AUTH_SECRET: "x".repeat(40),
  NEXT_PUBLIC_APP_URL: "https://memnuniyet.example",
  SMS_TEST_PHONE: "",
  TWO_FACTOR_ENABLED: "false",
};

describe("uretimSorunlari", () => {
  it("düzgün yapılandırmada sorun bulmaz", () => {
    expect(uretimSorunlari(saglam)).toEqual([]);
  });

  it("kısa veya boş AUTH_SECRET'i yakalar", () => {
    expect(uretimSorunlari({ ...saglam, AUTH_SECRET: "kisa" })[0]).toContain(
      "AUTH_SECRET",
    );
    expect(uretimSorunlari({ ...saglam, AUTH_SECRET: "" })[0]).toContain("boş");
  });

  it("localhost adresiyle QR basılmasını engeller", () => {
    const sorun = uretimSorunlari({
      ...saglam,
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    });
    expect(sorun.join(" ")).toContain("localhost");
  });

  it("şifresiz adresi reddeder — secure çerez http'de gitmez", () => {
    const sorun = uretimSorunlari({
      ...saglam,
      NEXT_PUBLIC_APP_URL: "http://memnuniyet.example",
    });
    expect(sorun.join(" ")).toContain("https");
  });

  it("test telefonunun canlıda unutulmasını engeller", () => {
    // En tehlikelisi bu: tüm müşterilerin doğrulama kodu tek telefona düşer.
    const sorun = uretimSorunlari({ ...saglam, SMS_TEST_PHONE: "+905364901001" });
    expect(sorun.join(" ")).toContain("SMS_TEST_PHONE");
  });

  it("2FA açıkken eksik SMS ayarını yakalar", () => {
    const sorun = uretimSorunlari({ ...saglam, TWO_FACTOR_ENABLED: "true" });
    expect(sorun.join(" ")).toContain("SMS_API_URL");
  });

  it("2FA kapalıyken SMS ayarı zorunlu değildir", () => {
    expect(uretimSorunlari({ ...saglam, TWO_FACTOR_ENABLED: "false" })).toEqual([]);
  });
});
