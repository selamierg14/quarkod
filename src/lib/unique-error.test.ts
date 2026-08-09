import { describe, expect, it } from "vitest";
import { uniqueConstraintMessage } from "./unique-error";
import { marketingConsentText } from "./iys";

describe("uniqueConstraintMessage", () => {
  it("kullanıcı adı çakışmasını Türkçe anlatır", () => {
    const hata = { code: "P2002", meta: { target: ["username"] } };
    expect(uniqueConstraintMessage(hata)).toContain("kullanıcı adı");
  });

  it("SQLite'ın tablo.sütun biçimini de tanır", () => {
    const hata = { code: "P2002", meta: { target: "users.username" } };
    expect(uniqueConstraintMessage(hata)).toContain("kullanıcı adı");
  });

  it("SQLite sürücüsünün gerçek hata biçimini tanır", () => {
    // Prisma 7 + better-sqlite3: alan adı meta.target'ta değil, sürücü
    // hatasının içinde geliyor. Bu vakayı canlıda ölçtük.
    const hata = {
      code: "P2002",
      meta: {
        modelName: "User",
        driverAdapterError: {
          name: "DriverAdapterError",
          cause: {
            originalMessage: "UNIQUE constraint failed: users.username",
            constraint: { fields: ["username"] },
          },
        },
      },
    };
    expect(uniqueConstraintMessage(hata)).toContain("kullanıcı adı");
  });

  it("son çare olarak hata mesajından çıkarır", () => {
    const hata = {
      code: "P2002",
      message: "Unique constraint failed on the fields: (`email`)",
    };
    expect(uniqueConstraintMessage(hata)).toContain("e-posta");
  });

  it("e-posta ve slug çakışmasını ayırt eder", () => {
    expect(
      uniqueConstraintMessage({ code: "P2002", meta: { target: ["email"] } }),
    ).toContain("e-posta");
    expect(
      uniqueConstraintMessage({ code: "P2002", meta: { target: ["slug"] } }),
    ).toContain("adres");
  });

  it("tekillik dışındaki hataları yutmaz", () => {
    // Bunlar yukarı fırlatılmalı; sessizce "zaten var" demek hatayı gizlerdi.
    expect(uniqueConstraintMessage({ code: "P2025" })).toBeNull();
    expect(uniqueConstraintMessage(new Error("bağlantı koptu"))).toBeNull();
    expect(uniqueConstraintMessage(null)).toBeNull();
  });
});

describe("ticari ileti onay metni", () => {
  it("kanalı ve markayı açıkça yazar", () => {
    const sms = marketingConsentText("Ege Cunda Balık", "telefon");
    expect(sms).toContain("Ege Cunda Balık");
    expect(sms).toContain("SMS");
    // Telefon veren birine e-posta izni yazmak, alınmamış bir onayı
    // beyan etmek olurdu.
    expect(sms).not.toContain("e-posta");

    const eposta = marketingConsentText("Sahne Marin", "eposta");
    expect(eposta).toContain("Sahne Marin");
    expect(eposta).toContain("e-posta");
    expect(eposta).not.toContain("SMS");
  });

  it("iznin geri alınabileceğini belirtir", () => {
    expect(marketingConsentText("X", "telefon")).toMatch(/geri alabilir/i);
  });
});
