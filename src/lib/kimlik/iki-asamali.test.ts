import { describe, it, expect, afterEach } from "vitest";
import { otpTelefonu, ikiAsamaliDurum, twoFactorEnabled, deliveryPhone } from "./iki-asamali";

/**
 * Bu dosyanın var oluş sebebi somut bir tuzak.
 *
 * Giriş akışı şöyleydi:
 *
 *     if (!twoFactorEnabled() || !user.phone) { ...oturumu aç, panele gir }
 *
 * İkinci koşul sessiz bir kapıydı: bayrak AÇIKKEN bile telefonu olmayan
 * kullanıcı SMS adımını hiç görmeden giriyordu. Veritabanında bu istisna
 * değil kuraldı — 74 aktif kullanıcının 51'inin telefonu yoktu. Yani
 * "2FA açık" denip hesapların %80'i tek faktörle girmeye devam edecekti ve
 * kimse fark etmeyecekti, çünkü giriş sorunsuz tamamlanıyor.
 *
 * Testin koruduğu şey: o dalın bir daha "geç" dememesi.
 */

const ONCEKI = process.env.TWO_FACTOR_ENABLED;
afterEach(() => {
  if (ONCEKI === undefined) delete process.env.TWO_FACTOR_ENABLED;
  else process.env.TWO_FACTOR_ENABLED = ONCEKI;
});

describe("otpTelefonu — bayraktan bağımsız", () => {
  it("geçerli numarayı normalleştiriyor", () => {
    // Panel numarayı farklı biçimlerde saklamış olabilir; kod gönderimi
    // tek kanonik biçimle çalışmalı.
    for (const ham of ["0532 123 45 67", "+90 532 123 45 67", "5321234567"]) {
      expect(otpTelefonu(ham), ham).toEqual({ durum: "hazir", telefon: "+905321234567" });
    }
  });

  it("telefon yoksa ayrı bir durum döndürüyor", () => {
    for (const bos of [null, undefined, "", "   "]) {
      expect(otpTelefonu(bos)).toEqual({ durum: "telefonYok" });
    }
  });

  it("bozuk numarayı 'yok' ile KARIŞTIRMIYOR", () => {
    /**
     * İki durumun ayrılması kozmetik değil: biri numara eklemeyi, diğeri
     * düzeltmeyi gerektiriyor ve kullanıcıya söylenecek cümle farklı.
     *
     * Aşağıdaki numara veritabanında gerçekten duruyordu — bir hane eksik.
     * Panelde "telefonu var" görünüyor ama sağlayıcı reddediyor.
     */
    expect(otpTelefonu("+90555011900")).toEqual({ durum: "telefonGecersiz" });
    // Sabit hat: SMS gidemez.
    expect(otpTelefonu("02121234567")).toEqual({ durum: "telefonGecersiz" });
    expect(otpTelefonu("düz metin")).toEqual({ durum: "telefonGecersiz" });
  });
});

describe("ikiAsamaliDurum — girişin kapısı", () => {
  it("bayrak kapalıyken SMS adımı atlanıyor", () => {
    process.env.TWO_FACTOR_ENABLED = "false";
    expect(ikiAsamaliDurum("+905321234567")).toEqual({ durum: "kapali" });
    expect(ikiAsamaliDurum(null)).toEqual({ durum: "kapali" });
  });

  it("BAYRAK AÇIKKEN telefonsuz kullanıcı GEÇEMİYOR", () => {
    // Zafiyetin ta kendisi. Bu satır "kapali" dönerse hesapların çoğu
    // 2FA açıkken bile tek faktörle giriyor demektir.
    process.env.TWO_FACTOR_ENABLED = "true";
    expect(ikiAsamaliDurum(null)).toEqual({ durum: "telefonYok" });
    expect(ikiAsamaliDurum("+90555011900")).toEqual({ durum: "telefonGecersiz" });
  });

  it("bayrak açık ve numara geçerliyse kod gönderilebilir", () => {
    process.env.TWO_FACTOR_ENABLED = "true";
    expect(ikiAsamaliDurum("0532 123 45 67")).toEqual({
      durum: "hazir",
      telefon: "+905321234567",
    });
  });

  it("bayrak yalnızca tam olarak 'true' iken açık", () => {
    // "1", "TRUE", "yes" gibi değerler kazara açık sayılmamalı — bir
    // güvenlik bayrağının belirsiz bir eşiği olmamalı.
    for (const deger of ["1", "TRUE", "True", "yes", "", "evet"]) {
      process.env.TWO_FACTOR_ENABLED = deger;
      expect(twoFactorEnabled(), deger).toBe(false);
    }
    process.env.TWO_FACTOR_ENABLED = "true";
    expect(twoFactorEnabled()).toBe(true);
  });
});

describe("deliveryPhone", () => {
  const ONCEKI_TEST = process.env.SMS_TEST_PHONE;
  afterEach(() => {
    if (ONCEKI_TEST === undefined) delete process.env.SMS_TEST_PHONE;
    else process.env.SMS_TEST_PHONE = ONCEKI_TEST;
  });

  it("SMS_TEST_PHONE doluyken kodlar oraya yönleniyor", () => {
    // Test aşamasında gerçek müşteri numaralarına SMS gitmesin diye.
    process.env.SMS_TEST_PHONE = "+905364901001";
    expect(deliveryPhone("+905321234567")).toBe("+905364901001");
  });

  it("boşken kullanıcının kendi numarası kullanılıyor", () => {
    // ÜRETİMDE bu değişken boş olmalı; doluysa herkesin kodu tek numaraya
    // gider ve 2FA tamamen anlamını yitirir.
    process.env.SMS_TEST_PHONE = "";
    expect(deliveryPhone("+905321234567")).toBe("+905321234567");
  });
});
