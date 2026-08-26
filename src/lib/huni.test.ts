import { describe, expect, it } from "vitest";
import { huniYuzdeleriHesapla } from "./huni";

describe("huniYuzdeleriHesapla", () => {
  it("görüntüleme yoksa hepsi null döner (bölme hatası yerine)", () => {
    const sonuc = huniYuzdeleriHesapla({ goruntuleme: 0, yildizVerdi: 0, gonderildi: 0 });
    expect(sonuc).toEqual({ yildizOrani: null, gonderimOrani: null, terkOrani: null });
  });

  it("normal huniyi doğru oranlar", () => {
    const sonuc = huniYuzdeleriHesapla({ goruntuleme: 100, yildizVerdi: 60, gonderildi: 45 });
    expect(sonuc.yildizOrani).toBe(60);
    expect(sonuc.gonderimOrani).toBe(45);
    // 60 yıldız verdi, 45'i gönderdi -> 15'i (yüzde 25'i) yıldız verip terk etti.
    expect(sonuc.terkOrani).toBeCloseTo(25);
  });

  it("hiç yıldız verilmemişse terk oranı null döner (gönderim de 0 olmak zorunda)", () => {
    const sonuc = huniYuzdeleriHesapla({ goruntuleme: 10, yildizVerdi: 0, gonderildi: 0 });
    expect(sonuc.terkOrani).toBeNull();
    expect(sonuc.yildizOrani).toBe(0);
  });

  it("herkes yıldız verip gönderdiyse terk oranı sıfırdır", () => {
    const sonuc = huniYuzdeleriHesapla({ goruntuleme: 20, yildizVerdi: 20, gonderildi: 20 });
    expect(sonuc.terkOrani).toBe(0);
  });
});
