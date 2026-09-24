import { describe, expect, it } from "vitest";
import { yeniBildirimSayisi } from "./bildirim-sayaci";
import type { BildirimOgesi } from "../api/tipler";

/**
 * Zil rozetinin sayısı.
 *
 * "Okundu" sunucuda tutulmuyor; tek dayanak cihazdaki "en son ne zaman
 * baktı" izi. Bu hesap yanlışsa iki kötü sonuçtan biri çıkıyor: rozet hiç
 * sönmüyor (kullanıcı bir süre sonra bakmayı bırakıyor) ya da hiç
 * yanmıyor (bildirim merkezi görünmez bir ekrana dönüşüyor).
 */

function oge(tarih: string): BildirimOgesi {
  return {
    id: `o-${tarih}`,
    tur: "rozet",
    tarih,
    baslik: "Yeni rozet",
    aciklama: null,
    href: "/profil",
  };
}

// Sunucu en yeniden eskiye sıralı gönderiyor.
const OGELER = [
  oge("2026-09-16T12:00:00.000Z"),
  oge("2026-09-15T09:00:00.000Z"),
  oge("2026-09-10T18:00:00.000Z"),
];

describe("yeni bildirim sayısı", () => {
  it("hiç bakılmamışsa hepsi yeni", () => {
    expect(yeniBildirimSayisi(OGELER, null)).toBe(3);
  });

  it("son bakıştan sonrakiler sayılıyor", () => {
    expect(yeniBildirimSayisi(OGELER, "2026-09-15T09:00:00.000Z")).toBe(1);
  });

  it("en yeniye kadar bakılmışsa rozet SÖNÜYOR", () => {
    /**
     * Damga listenin en yeni öğesinin tarihi olduğu için, ekranı açan
     * kullanıcıda bu tam olarak sıfıra inmeli. Karşılaştırma `>=` olsaydı
     * rozet hiç sönmezdi.
     */
    expect(yeniBildirimSayisi(OGELER, "2026-09-16T12:00:00.000Z")).toBe(0);
  });

  it("liste henüz gelmemişse rozet yanmıyor", () => {
    // `null` "bilinmiyor" demek; bilinmeyeni "yeni var" saymak, açılışta
    // her kullanıcıya yanlışlıkla kırmızı nokta göstermek olurdu.
    expect(yeniBildirimSayisi(null, null)).toBe(0);
  });

  it("boş listede sıfır", () => {
    expect(yeniBildirimSayisi([], null)).toBe(0);
  });

  it("damgadan eski bir öğe sonradan gelse bile sayılmıyor", () => {
    // Sunucu sıralaması değişse de karşılaştırma tarih üzerinden; sıra
    // değil zaman belirleyici.
    const karisik = [oge("2026-09-10T18:00:00.000Z"), oge("2026-09-16T12:00:00.000Z")];
    expect(yeniBildirimSayisi(karisik, "2026-09-12T00:00:00.000Z")).toBe(1);
  });
});
