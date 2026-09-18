import { describe, it, expect } from "vitest";
import { gorselAdresi, mekanOzeti, MEKAN_OZETI_SECIMI } from "./gorsel-adres";

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

describe("mekanOzeti", () => {
  /**
   * Bu eşleme yedi ayrı uçta elle yazılıydı. Testin koruduğu şey tek tek
   * alanlar değil, ÇIKTI SÖZLEŞMESİ: mobil uygulama bu alan adlarını
   * okuyor ve biri değişirse sessizce boş bir logo ya da isimsiz bir
   * mekan çiziyor.
   */
  const kaynak = {
    id: "biz_1",
    slug: "ada-kahvesi",
    name: "Ada Kahvesi",
    logoUrl: "data:image/webp;base64,AAAA",
  };

  it("Prisma satırını API şekline çeviriyor", () => {
    const sonuc = mekanOzeti(kaynak);
    expect(Object.keys(sonuc)).toEqual(["id", "slug", "ad", "logoUrl"]);
    expect(sonuc.id).toBe("biz_1");
    expect(sonuc.slug).toBe("ada-kahvesi");
    // `name` → `ad`: mobil taraf Türkçe alan adı bekliyor.
    expect(sonuc.ad).toBe("Ada Kahvesi");
  });

  it("logo adresini gorselAdresi üzerinden üretiyor", () => {
    // Ham data URI doğrudan yanıta konmuyor; adrese çevriliyor.
    expect(mekanOzeti(kaynak).logoUrl).toBe(
      gorselAdresi(kaynak.id, "logo", kaynak.logoUrl),
    );
  });

  it("logosuz mekanda null dönüyor", () => {
    expect(mekanOzeti({ ...kaynak, logoUrl: null }).logoUrl).toBeNull();
  });

  it("select sabiti eşleyicinin okuduğu alanları kapsıyor", () => {
    // Select ile eşleyici ayrışırsa sorgu alanı çekmez, eşleyici de
    // undefined yazar — ve bu ancak ekranda fark edilir.
    expect(Object.keys(MEKAN_OZETI_SECIMI).sort()).toEqual(
      ["id", "logoUrl", "name", "slug"].sort(),
    );
  });
});
