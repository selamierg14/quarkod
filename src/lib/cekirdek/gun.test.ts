import { describe, expect, it } from "vitest";
import { gunAdi, gunEkle, gunGirdisi, gunGirdisindenTarih, haftaBaslangici } from "./gun";

describe("hafta başlangıcı", () => {
  it("haftanın pazartesisini verir", () => {
    // 28.08.2026 cuma → 24.08 pazartesi.
    expect(gunGirdisi(haftaBaslangici(new Date(2026, 7, 28)))).toBe("2026-08-24");
  });

  it("pazar gününde bir önceki pazartesiye gider", () => {
    // Pazar haftanın SONU: getDay()=0 tuzağına düşülmemeli.
    expect(gunGirdisi(haftaBaslangici(new Date(2026, 7, 30)))).toBe("2026-08-24");
  });

  it("pazartesi kendisini verir", () => {
    expect(gunGirdisi(haftaBaslangici(new Date(2026, 7, 24)))).toBe("2026-08-24");
  });
});

describe("gün adı", () => {
  it("Türkçe gün adını verir", () => {
    expect(gunAdi(new Date(2026, 7, 24))).toBe("Pazartesi");
    expect(gunAdi(new Date(2026, 7, 30))).toBe("Pazar");
  });
});

describe("gün ekleme", () => {
  it("ay sınırını geçer", () => {
    expect(gunGirdisi(gunEkle(new Date(2026, 7, 30), 3))).toBe("2026-09-02");
  });

  it("geriye doğru çalışır", () => {
    expect(gunGirdisi(gunEkle(new Date(2026, 8, 2), -3))).toBe("2026-08-30");
  });
});

describe("gün anahtarı ↔ tarih dönüşümü", () => {
  it("gunGirdisi ve gunGirdisindenTarih birbirinin tersi", () => {
    const tarih = new Date(2026, 7, 28);
    expect(gunGirdisindenTarih(gunGirdisi(tarih)).getTime()).toBe(tarih.getTime());
  });

  it("anahtarı YEREL gece yarısı olarak çözer, UTC değil", () => {
    // new Date("2026-08-28") UTC gece yarısıdır; negatif ofsetli bir
    // makinede bu bir önceki güne düşer ve çizelge bir gün kayar.
    // Vardiyalarım ekranı tam bu yüzden yanlış günü gösteriyordu.
    const cozulen = gunGirdisindenTarih("2026-08-28");
    expect(cozulen.getFullYear()).toBe(2026);
    expect(cozulen.getMonth()).toBe(7);
    expect(cozulen.getDate()).toBe(28);
    expect(cozulen.getHours()).toBe(0);
  });

  it("gün başında ve sonunda aynı anahtarı üretir", () => {
    // Saat kaç olursa olsun gün aynı: gruplama saate kaymamalı.
    expect(gunGirdisi(new Date(2026, 7, 28, 0, 0))).toBe("2026-08-28");
    expect(gunGirdisi(new Date(2026, 7, 28, 23, 59))).toBe("2026-08-28");
  });

  it("ay ve gün tek haneliyse sıfırla doldurur", () => {
    expect(gunGirdisi(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(gunGirdisindenTarih("2026-01-05").getMonth()).toBe(0);
  });
});
