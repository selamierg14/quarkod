import { describe, expect, it } from "vitest";
import { MIN_SIFRE_UZUNLUK, sifreSorunu } from "./sifre";

/**
 * Şifre kuralı beş ayrı akışta (deneme, sıfırlama, hesap/işletme/kullanıcı
 * açma) kullanılıyor. Buradaki bir kırmızı, o akışlardan birinin zayıf bir
 * şifreyi sessizce kabul etmesi demek — tam da tek kaynağa taşınma sebebi.
 */
describe("sifreSorunu", () => {
  it("yeterince uzun ve harf içeren şifreyi kabul eder", () => {
    expect(sifreSorunu("Deneme1234")).toBeNull();
    expect(sifreSorunu("kahvedukkani")).toBeNull();
  });

  it("kısa şifreyi reddeder", () => {
    expect(sifreSorunu("kisa12")).toMatch(/en az/);
    expect(sifreSorunu("a".repeat(MIN_SIFRE_UZUNLUK - 1))).toMatch(/en az/);
  });

  it("sınırdaki uzunluğu kabul eder", () => {
    expect(sifreSorunu("abcdefg1")).toBeNull(); // tam 8, harf var
  });

  it("yalnızca rakamdan oluşan şifreyi reddeder", () => {
    // Deneme formu bunu kabul ediyordu ama panel etmiyordu; asıl kapatılan açık.
    expect(sifreSorunu("12345678")).toMatch(/rakam/);
    expect(sifreSorunu("00000000000")).toMatch(/rakam/);
  });

  it("araya bir harf giren rakam dizisini kabul eder", () => {
    expect(sifreSorunu("1234567a")).toBeNull();
  });
});
