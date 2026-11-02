import { describe, expect, it } from "vitest";
import { duyuruAktifMi, duyuruDurumu, duyuruTarihHatasi } from "./duyuru";

/** Yerel saatle tarih — testler makinenin saat diliminden bağımsız. */
const t = (gun: number, saat = 12) => new Date(2026, 0, gun, saat, 0, 0);
const simdi = t(10, 14);

describe("duyuruDurumu", () => {
  it("tarihsiz ve aktif duyuru yayında", () => {
    expect(duyuruDurumu({ aktif: true, baslangic: null, bitis: null }, simdi)).toBe("yayinda");
  });

  it("bitişi geçmiş duyuru — aktif olsa da — süresi doldu (QA: yeşil 'Yayında' görünüyordu)", () => {
    expect(duyuruDurumu({ aktif: true, baslangic: t(1, 0), bitis: t(5, 0) }, simdi)).toBe(
      "suresi-doldu",
    );
    expect(duyuruDurumu({ aktif: false, baslangic: null, bitis: t(5, 0) }, simdi)).toBe(
      "suresi-doldu",
    );
  });

  it("bitiş günü DAHİL: son günün akşamı hâlâ yayında", () => {
    expect(duyuruDurumu({ aktif: true, baslangic: null, bitis: t(10, 0) }, t(10, 23))).toBe(
      "yayinda",
    );
    expect(duyuruDurumu({ aktif: true, baslangic: null, bitis: t(10, 0) }, t(11, 0))).toBe(
      "suresi-doldu",
    );
  });

  it("UTC gece yarısı saklanmış bitiş (eski kayıtlar) de gün olarak okunuyor", () => {
    // new Date("2026-01-10") → UTC 00:00; İstanbul'da 03:00. Gün başına
    // indirgendiği için son gün akşamına kadar yayında kalıyor.
    const eski = new Date(2026, 0, 10, 3, 0, 0);
    expect(duyuruDurumu({ aktif: true, baslangic: null, bitis: eski }, t(10, 20))).toBe("yayinda");
  });

  it("başlangıcı gelmemiş duyuru planlandı; başlangıç günü sabahtan itibaren yayında", () => {
    expect(duyuruDurumu({ aktif: true, baslangic: t(12, 0), bitis: null }, simdi)).toBe(
      "planlandi",
    );
    expect(duyuruDurumu({ aktif: true, baslangic: t(10, 9), bitis: null }, t(10, 1))).toBe(
      "yayinda",
    );
  });

  it("pasif duyuru pasif; müşteriye yalnızca 'yayında' olan görünür", () => {
    expect(duyuruDurumu({ aktif: false, baslangic: null, bitis: null }, simdi)).toBe("pasif");
    expect(duyuruAktifMi({ aktif: false, baslangic: null, bitis: null }, simdi)).toBe(false);
    expect(duyuruAktifMi({ aktif: true, baslangic: t(12, 0), bitis: null }, simdi)).toBe(false);
    expect(duyuruAktifMi({ aktif: true, baslangic: null, bitis: null }, simdi)).toBe(true);
  });
});

describe("duyuruTarihHatasi", () => {
  it("ters aralık", () => {
    expect(duyuruTarihHatasi(t(12, 0), t(11, 0), simdi)).toMatch(/bitişten sonra/);
  });

  it("geçmişte biten duyuru kaydedilmiyor (QA: 01.01–05.01 eklenebiliyordu)", () => {
    expect(duyuruTarihHatasi(t(1, 0), t(5, 0), simdi)).toMatch(/geçmişte/);
  });

  it("düzenlemede bitiş değişmediyse geçmiş bitiş engel değil, ters aralık yine engel", () => {
    expect(duyuruTarihHatasi(t(1, 0), t(5, 0), simdi, false)).toBeNull();
    expect(duyuruTarihHatasi(t(6, 0), t(5, 0), simdi, false)).toMatch(/bitişten sonra/);
  });

  it("bugün biten ve tarihsiz duyuru geçerli", () => {
    expect(duyuruTarihHatasi(null, t(10, 0), simdi)).toBeNull();
    expect(duyuruTarihHatasi(null, null, simdi)).toBeNull();
    expect(duyuruTarihHatasi(t(10, 0), t(10, 0), simdi)).toBeNull();
  });
});
