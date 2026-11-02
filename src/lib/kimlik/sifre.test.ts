import { describe, expect, it } from "vitest";
import {
  MAX_SIFRE_UZUNLUK,
  MIN_SIFRE_UZUNLUK,
  sifreSorunu,
  yeniSifreSorunu,
} from "./sifre";
import { alanKurali } from "../cekirdek/desenler";

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

describe("azami uzunluk", () => {
  /**
   * Üst sınır bir DoS savunması: bcrypt'in maliyeti girdiyle artıyor ve bu
   * fonksiyon kimlik doğrulaması gerektirmeyen giriş formundan besleniyor.
   */
  it("128 karakteri kabul, 129'u reddediyor", () => {
    expect(sifreSorunu("a".repeat(MAX_SIFRE_UZUNLUK))).toBeNull();
    expect(sifreSorunu("a".repeat(MAX_SIFRE_UZUNLUK + 1))).not.toBeNull();
  });

  it("sınır desenler.ts ile aynı", () => {
    // İki taraf ayrışırsa arayüz kabul edip sunucu reddeder (ya da tersi).
    expect(alanKurali("sifre").enCok).toBe(MAX_SIFRE_UZUNLUK);
    expect(alanKurali("sifre").enAz).toBe(MIN_SIFRE_UZUNLUK);
  });

  it("uzun ama geçerli bir parola yöneticisi çıktısı geçiyor", () => {
    // Karakter kısıtı koysaydık bu tür diziler reddedilir ve kullanıcı
    // daha zayıf bir parolaya yönlendirilmiş olurdu.
    expect(sifreSorunu("Xq7#mZ!2vL@9pR$4tK&8nW*1jH%6bF^3")).toBeNull();
  });
});

describe("yeniSifreSorunu — iki kutu birlikte", () => {
  /**
   * Yeni şifre dört ayrı yerde belirleniyor ve dördü de aynı iki kontrolü
   * yapmak zorunda. Kural burada tek yerde; testi de burada.
   */
  it("kutular uyuşmuyorsa ÖNCE bunu söylüyor", () => {
    // Sıra önemli: "en az 8 karakter" deyip düzelttirmek, sonra "uyuşmuyor"
    // deyip bir tur daha attırmak iki turluk bir akış demekti.
    expect(yeniSifreSorunu("kisa", "bambaskasi")).toBe("Şifreler birbiriyle uyuşmuyor.");
  });

  it("uyuşuyorsa biçim kuralı işliyor", () => {
    expect(yeniSifreSorunu("kisa", "kisa")).toBe("Şifre en az 8 karakter olmalı.");
    expect(yeniSifreSorunu("12345678", "12345678")).toBe("Şifre sadece rakamlardan oluşmasın.");
  });

  it("ikisi de doğruysa sorun yok", () => {
    expect(yeniSifreSorunu("guclu-bir-sifre", "guclu-bir-sifre")).toBeNull();
  });

  it("boşluk farkı bile uyuşmazlık — kırpma YAPILMIYOR", () => {
    // Şifrenin sonundaki boşluk şifrenin parçası; kırpmak kullanıcının
    // gerçekten belirlediği şifreyi sessizce değiştirmek olurdu.
    expect(yeniSifreSorunu("sifre123a", "sifre123a ")).toBe(
      "Şifreler birbiriyle uyuşmuyor.",
    );
  });
});
