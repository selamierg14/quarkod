import { describe, expect, it } from "vitest";
import {
  TERCIH_ANAHTARLARI,
  gecerliTercihMi,
  tercihListesi,
  tercihleriBirlestir,
  varsayilanTercihler,
} from "./bildirim-tercihi";

describe("varsayilanTercihler", () => {
  it("hepsi açık başlıyor", () => {
    const t = varsayilanTercihler();
    expect(TERCIH_ANAHTARLARI.every((a) => t[a])).toBe(true);
  });
});

describe("gecerliTercihMi", () => {
  it("tanımlı anahtarları tanır, uydurmaları reddeder", () => {
    expect(gecerliTercihMi("firsat")).toBe(true);
    expect(gecerliTercihMi("rezervasyon")).toBe(false);
    expect(gecerliTercihMi("__proto__")).toBe(false);
  });
});

describe("tercihleriBirlestir", () => {
  it("yalnızca gönderilen anahtarı değiştirir", () => {
    const sonuc = tercihleriBirlestir(varsayilanTercihler(), { firsat: false });
    expect(sonuc.firsat).toBe(false);
    expect(sonuc.rozet).toBe(true);
  });

  it("boolean olmayan değeri yok sayar — kapalı kanal kendiliğinden açılmaz", () => {
    const kapali = { ...varsayilanTercihler(), firsat: false };
    expect(tercihleriBirlestir(kapali, { firsat: "evet" }).firsat).toBe(false);
    expect(tercihleriBirlestir(kapali, { firsat: 1 }).firsat).toBe(false);
  });

  it("tanınmayan anahtarı yok sayar", () => {
    const sonuc = tercihleriBirlestir(varsayilanTercihler(), { reklam: true }) as Record<
      string,
      unknown
    >;
    expect(sonuc.reklam).toBeUndefined();
  });

  it("nesne olmayan gövdede mevcut tercihi korur", () => {
    const mevcut = { ...varsayilanTercihler(), rozet: false };
    expect(tercihleriBirlestir(mevcut, null)).toEqual(mevcut);
    expect(tercihleriBirlestir(mevcut, "hepsi")).toEqual(mevcut);
    expect(tercihleriBirlestir(mevcut, [true])).toEqual(mevcut);
  });

  it("mevcut nesneyi değiştirmiyor", () => {
    const mevcut = varsayilanTercihler();
    tercihleriBirlestir(mevcut, { firsat: false });
    expect(mevcut.firsat).toBe(true);
  });
});

describe("tercihListesi", () => {
  it("her kategori için ad, açıklama ve durum veriyor", () => {
    const liste = tercihListesi({ ...varsayilanTercihler(), firsat: false });
    expect(liste).toHaveLength(TERCIH_ANAHTARLARI.length);
    expect(liste.find((t) => t.anahtar === "firsat")).toMatchObject({ acik: false });
    expect(liste.every((t) => t.ad.length > 0 && t.aciklama.length > 0)).toBe(true);
  });
});
