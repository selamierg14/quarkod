import { describe, expect, it } from "vitest";
import { cakisanAlanlar, tekillikAlanlari, uniqueConstraintMessage } from "./unique-error";
import { slugCakismasiMi } from "./slug";
import { marketingConsentText } from "../isletme/iys";

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

/**
 * Prisma 7.10 + @prisma/adapter-pg'nin GERÇEK hata biçimi — canlı Postgres'e
 * karşı, başarısız bir slug güncellemesiyle ölçüldü (hiçbir şey yazılmadı).
 * 7.9'a kadar `constraint.fields` geliyordu; 7.10'da yalnızca kısıt adı var.
 */
function pg710Hatasi(indeks: string, tablo: string | undefined, model: string) {
  return {
    code: "P2002",
    message: `Unique constraint failed on the constraint: \`${indeks}\``,
    meta: {
      driverAdapterError: {
        name: "DriverAdapterError",
        cause: {
          originalCode: "23505",
          originalMessage: `duplicate key value violates unique constraint "${indeks}"`,
          kind: "UniqueConstraintViolation",
          constraint: { index: indeks },
          ...(tablo ? { table: tablo } : {}),
        },
      },
      modelName: model,
    },
  };
}

describe("Prisma 7.10 kısıt adı biçimi", () => {
  it("slug çakışmasını tanır — yeniden deneme buna bağlı", () => {
    const hata = pg710Hatasi("businesses_slug_key", "businesses", "Business");
    expect(cakisanAlanlar(hata)).toEqual(["slug"]);
    expect(slugCakismasiMi(hata)).toBe(true);
    expect(uniqueConstraintMessage(hata)).toContain("işletme adresi");
  });

  it("kullanıcı adı ve sosyal giriş kimliğini tanır", () => {
    expect(tekillikAlanlari(pg710Hatasi("app_users_username_key", "app_users", "AppUser"))).toEqual([
      "username",
    ]);
    expect(
      tekillikAlanlari(pg710Hatasi("app_users_googleSub_key", "app_users", "AppUser")),
    ).toEqual(["googleSub"]);
  });

  it("birleşik tekillikte alanların hepsini verir", () => {
    expect(
      cakisanAlanlar(pg710Hatasi("shift_assignments_userId_date_key", "shift_assignments", "X")),
    ).toEqual(["userId", "date"]);
  });

  it("tablo adı bilinmiyorsa hata metninden de çıkarır", () => {
    const hata = pg710Hatasi("businesses_slug_key", undefined, "Business");
    expect(slugCakismasiMi(hata)).toBe(true);
  });

  it("kurala uymayan elle adlandırılmış indekste alan uydurmaz", () => {
    const hata = pg710Hatasi("mesai_tek_acik_kayit", "mesai_kayitlari", "MesaiKaydi");
    expect(cakisanAlanlar(hata)).toEqual([]);
    expect(slugCakismasiMi(hata)).toBe(false);
    expect(uniqueConstraintMessage(hata)).toBe(
      "Bu kayıt zaten mevcut. Girdiğiniz bilgileri kontrol edin.",
    );
  });

  it("başka tablonun kısıtında slug saymıyor", () => {
    // Tablo öneki tutmuyorsa (beklenmeyen biçim) alan çıkarılmıyor.
    expect(cakisanAlanlar(pg710Hatasi("businesses_slug_key", "menus", "Menu"))).toEqual([]);
  });

  it("tekillikAlanlari tekillik dışı hatada boş döner", () => {
    expect(tekillikAlanlari({ code: "P2025" })).toEqual([]);
    expect(tekillikAlanlari(null)).toEqual([]);
    expect(tekillikAlanlari({ code: "P2002", meta: { target: "users.username" } })).toEqual([
      "username",
    ]);
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
