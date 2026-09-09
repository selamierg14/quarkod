import { describe, expect, it } from "vitest";
import {
  formatConsentDate,
  normalizeEmail,
  normalizePhone,
  toIysPayload,
  toRecipient,
} from "./iys";

/**
 * İYS'ye hatalı biçimde kayıt göndermek, olmayan bir izni beyan etmek kadar
 * riskli. Normalleştirme bu yüzden testli.
 */
describe("normalizePhone", () => {
  it("yaygın Türkçe yazımları tek biçime indirir", () => {
    const beklenen = "+905321112233";
    expect(normalizePhone("0532 111 22 33")).toBe(beklenen);
    expect(normalizePhone("05321112233")).toBe(beklenen);
    expect(normalizePhone("5321112233")).toBe(beklenen);
    expect(normalizePhone("+90 532 111 22 33")).toBe(beklenen);
    expect(normalizePhone("90-532-111-22-33")).toBe(beklenen);
    expect(normalizePhone("(0532) 111 22 33")).toBe(beklenen);
  });

  it("cep telefonu olmayanı reddeder", () => {
    // Sabit hat (2/3 ile başlar) ticari ileti izni için geçerli alıcı değil.
    expect(normalizePhone("0212 111 22 33")).toBeNull();
    expect(normalizePhone("312 111 22 33")).toBeNull();
  });

  it("eksik veya bozuk numarayı reddeder", () => {
    expect(normalizePhone("532111")).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("abc")).toBeNull();
    expect(normalizePhone("053211122334455")).toBeNull();
  });
});

describe("normalizeEmail", () => {
  it("küçük harfe indirir ve boşluk kırpar", () => {
    expect(normalizeEmail("  Ornek@Eposta.COM ")).toBe("ornek@eposta.com");
  });

  it("geçersizi reddeder", () => {
    expect(normalizeEmail("ornek@")).toBeNull();
    expect(normalizeEmail("ornek.com")).toBeNull();
    expect(normalizeEmail("")).toBeNull();
  });
});

describe("toRecipient", () => {
  it("telefon için MESAJ kanalı seçer", () => {
    expect(toRecipient("telefon", "0532 111 22 33")).toEqual({
      channel: "MESAJ",
      recipient: "+905321112233",
    });
  });

  it("e-posta için EPOSTA kanalı seçer", () => {
    expect(toRecipient("eposta", "Kisi@Ornek.com")).toEqual({
      channel: "EPOSTA",
      recipient: "kisi@ornek.com",
    });
  });

  it("çevrilemeyen değerde null döner — hatalı kayıt göndermektense hiç gönderme", () => {
    expect(toRecipient("telefon", "0212 111 22 33")).toBeNull();
    expect(toRecipient("eposta", "bozuk")).toBeNull();
  });
});

describe("formatConsentDate", () => {
  it("İYS biçimini üretir", () => {
    const t = new Date(2026, 7, 8, 9, 5, 3);
    expect(formatConsentDate(t)).toBe("2026-08-08 09:05:03");
  });
});

describe("toIysPayload", () => {
  it("alan adları İYS sözlüğüyle birebir eşleşir", () => {
    const payload = toIysPayload({
      recipient: "+905321112233",
      channel: "MESAJ",
      recipientType: "BIREYSEL",
      status: "ONAY",
      source: "HS_WEB",
      consentAt: new Date(2026, 7, 8, 12, 0, 0),
    });

    expect(payload).toEqual({
      recipient: "+905321112233",
      type: "MESAJ",
      recipientType: "BIREYSEL",
      status: "ONAY",
      source: "HS_WEB",
      consentDate: "2026-08-08 12:00:00",
    });
    // "channel" bizim iç adımız; dışarı "type" olarak çıkmalı.
    expect(payload).not.toHaveProperty("channel");
  });
});
