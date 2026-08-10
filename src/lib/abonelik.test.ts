import { describe, expect, it } from "vitest";
import { abonelikUyarisi, hesapAktifMi, kalanGun, tarihGirdisi } from "./abonelik";

const simdi = new Date("2026-08-10T12:00:00Z");
const gunSonra = (n: number) => new Date(simdi.getTime() + n * 24 * 60 * 60 * 1000);

describe("hesapAktifMi", () => {
  it("süresiz ve açık hesabı kabul eder", () => {
    expect(hesapAktifMi({ active: true, expiresAt: null }, simdi)).toBe(true);
  });

  it("elle askıya alınanı reddeder", () => {
    expect(hesapAktifMi({ active: false, expiresAt: null }, simdi)).toBe(false);
  });

  it("süresi dolanı, active true olsa bile reddeder", () => {
    // İki sebep de aynı sonucu doğurmalı; ödeme gelmediyse "aktif" bayrağı
    // açık kaldı diye hizmet sürmemeli.
    expect(hesapAktifMi({ active: true, expiresAt: gunSonra(-1) }, simdi)).toBe(false);
  });

  it("süresi gelecekte olanı kabul eder", () => {
    expect(hesapAktifMi({ active: true, expiresAt: gunSonra(1) }, simdi)).toBe(true);
  });

  it("hesap yoksa reddeder", () => {
    expect(hesapAktifMi(null, simdi)).toBe(false);
    expect(hesapAktifMi(undefined, simdi)).toBe(false);
  });
});

describe("kalanGun", () => {
  it("süresiz hesapta null döner", () => {
    expect(kalanGun({ active: true, expiresAt: null }, simdi)).toBeNull();
  });

  it("kalan günü yukarı yuvarlar", () => {
    expect(kalanGun({ active: true, expiresAt: gunSonra(3) }, simdi)).toBe(3);
  });

  it("süresi dolmuşsa null döner", () => {
    expect(kalanGun({ active: true, expiresAt: gunSonra(-2) }, simdi)).toBeNull();
  });
});

describe("abonelikUyarisi", () => {
  it("uzak tarihte uyarı vermez", () => {
    expect(abonelikUyarisi({ active: true, expiresAt: gunSonra(60) }, simdi)).toBeNull();
  });

  it("son iki hafta içinde uyarır", () => {
    // Kafenin QR'larının bir sabah çalışmadığını müşteriden duyması,
    // hizmete duyulan güveni en hızlı bitiren şey olurdu.
    const uyari = abonelikUyarisi({ active: true, expiresAt: gunSonra(5) }, simdi);
    expect(uyari?.seviye).toBe("yakin");
    expect(uyari?.mesaj).toContain("5 gün");
  });

  it("süresi dolduğunu ayrı seviyede bildirir", () => {
    const uyari = abonelikUyarisi({ active: true, expiresAt: gunSonra(-1) }, simdi);
    expect(uyari?.seviye).toBe("bitti");
  });

  it("süresiz hesapta uyarı yok", () => {
    expect(abonelikUyarisi({ active: true, expiresAt: null }, simdi)).toBeNull();
  });
});

describe("tarihGirdisi", () => {
  it("girilen günü dahil eder", () => {
    // "31 Aralık'a kadar" o günün sonuna kadar demektir; gece yarısına
    // sabitleseydik son gün kullanılamazdı.
    const t = tarihGirdisi("2026-12-31") as Date;
    expect(t.getFullYear()).toBe(2026);
    expect(t.getMonth()).toBe(11);
    expect(t.getDate()).toBe(31);
    expect(t.getHours()).toBe(23);
  });

  it("boş girdi süresiz demektir", () => {
    expect(tarihGirdisi("")).toBeNull();
  });

  it("olmayan tarihi reddeder", () => {
    expect(tarihGirdisi("2026-02-31")).toBeUndefined();
    expect(tarihGirdisi("yarın")).toBeUndefined();
    expect(tarihGirdisi("31-12-2026")).toBeUndefined();
  });
});
