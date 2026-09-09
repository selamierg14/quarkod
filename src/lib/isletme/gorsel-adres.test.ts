import { describe, it, expect } from "vitest";
import { gorselAdresi } from "./gorsel-adres";

describe("gorselAdresi", () => {
  it("değer yoksa null verir", () => {
    expect(gorselAdresi("biz1", "kapak", null)).toBeNull();
    expect(gorselAdresi("biz1", "kapak", "")).toBeNull();
  });

  it("data URI'yi önbelleklenebilir /g/ adresine çevirir", () => {
    const adres = gorselAdresi("biz1", "kapak", "data:image/png;base64,AAAA");
    expect(adres).toMatch(/^\/g\/biz1\/kapak\?s=[0-9a-f]{12}$/);
  });

  it("içerik değişince adres de değişir", () => {
    const a = gorselAdresi("biz1", "logo", "data:image/png;base64,AAAA");
    const b = gorselAdresi("biz1", "logo", "data:image/png;base64,BBBB");
    expect(a).not.toBe(b);
  });

  it("http(s) adresine dokunmaz", () => {
    expect(gorselAdresi("biz1", "kapak", "https://cdn.example/x.jpg")).toBe(
      "https://cdn.example/x.jpg",
    );
  });

  it("uygulamaya göreli statik yolu olduğu gibi verir", () => {
    // Demo mekan fotoğrafları public/ altında duruyor; data URI olarak
    // saklanınca keşfet listesi her istekte megabaytlarca gereksiz veri
    // okuyordu (bkz. scripts/demo-gorsel.ts).
    expect(gorselAdresi("biz1", "kapak", "/mekan-gorselleri/kafe-1.jpg")).toBe(
      "/mekan-gorselleri/kafe-1.jpg",
    );
  });

  it("protokolsüz dış adresi reddeder", () => {
    // `//baska.example/x.jpg` tarayıcıda dış bir adrese çözülür; göreli
    // yol geçişi buna kapı açmamalı.
    expect(gorselAdresi("biz1", "kapak", "//baska.example/x.jpg")).toBeNull();
  });

  it("tanımadığı biçimi reddeder", () => {
    expect(gorselAdresi("biz1", "kapak", "kafe-1.jpg")).toBeNull();
    expect(gorselAdresi("biz1", "kapak", "javascript:alert(1)")).toBeNull();
  });
});
