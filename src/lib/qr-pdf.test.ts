import QRCode from "qrcode";
import { describe, expect, it } from "vitest";
import { hexToRgb, kisalt, metinGenisligi, pdfMetin } from "./pdf";
import {
  SAYFA_BASINA,
  kartKutulari,
  modulDizileri,
  qrPdfUret,
  satirlaraBol,
} from "./qr-pdf";

/**
 * Bu dosyanın çıktısı matbaaya gidiyor: hata baskıdan sonra fark edilir ve
 * bütün kartlar çöp olur. Buradaki testler "dosya açılıyor mu" ve "yazı
 * kutudan taşıyor mu" sorularını baskıdan önce cevaplıyor.
 */

describe("PDF metin kaçışı", () => {
  it("parantez ve ters bölüyü kaçırır", () => {
    // Kaçırılmazsa dize erken kapanır ve dosya bozulur.
    expect(pdfMetin("Kafe (merkez)")).toBe("Kafe \\(merkez\\)");
    expect(pdfMetin("a\\b")).toBe("a\\\\b");
  });

  it("Türkçe harfleri sekizli koda çevirir", () => {
    // WinAnsi'de bu harfler yok; /Differences ile tanıttığımız kodlara gider.
    expect(pdfMetin("ş")).toBe("\\200");
    expect(pdfMetin("İ")).toBe("\\205");
    expect(pdfMetin("KESKİN")).toBe("KESK\\205N");
  });

  it("tanımadığı karakteri soru işaretine düşürür", () => {
    // Tanımsız bayt baskıda rastgele bir glif olur ve kimse fark etmez.
    expect(pdfMetin("emoji 🎉")).toBe("emoji ?");
  });
});

describe("renk dönüşümü", () => {
  it("hex'i 0-1 aralığına çevirir", () => {
    expect(hexToRgb("#ffffff")).toEqual({ r: 1, g: 1, b: 1 });
    expect(hexToRgb("#000000")).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("bozuk değerde siyaha düşer", () => {
    // Baskıda yanlış renk, hiç renk olmamasından kötü.
    expect(hexToRgb("mor")).toEqual({ r: 0, g: 0, b: 0 });
  });
});

describe("metin kısaltma", () => {
  it("sığan metne dokunmaz", () => {
    expect(kisalt("Masa 4", 200, 9, true)).toBe("Masa 4");
  });

  it("sığmayan metni kutuya indirir", () => {
    const uzun = "Çok Uzun Bir İşletme Adı Buraya Yazıldı";
    const kisa = kisalt(uzun, 80, 11, true);
    expect(kisa.length).toBeLessThan(uzun.length);
    expect(metinGenisligi(kisa, 11, true)).toBeLessThanOrEqual(80);
  });
});

describe("satırlara bölme", () => {
  it("uzun cümleyi satır sınırına böler", () => {
    const satirlar = satirlaraBol(
      "Deneyiminizi değerlendirin, 30 saniyenizi alır",
      120,
      7.5,
      2,
    );
    expect(satirlar.length).toBeGreaterThan(1);
    expect(satirlar.length).toBeLessThanOrEqual(2);
  });

  it("satır sayısını aşmaz", () => {
    // Aşarsa alttaki QR'ın üstüne biner.
    const satirlar = satirlaraBol("bir iki üç dört beş altı yedi sekiz", 40, 7.5, 2);
    expect(satirlar.length).toBeLessThanOrEqual(2);
  });

  it("her satırı kutu genişliğinde tutar", () => {
    for (const satir of satirlaraBol("kelimelerkelimelerkelimeler daha", 50, 7.5, 2)) {
      expect(metinGenisligi(satir, 7.5, false)).toBeLessThanOrEqual(50);
    }
  });

  it("boş metinde satır üretmez", () => {
    expect(satirlaraBol("   ", 100, 8, 2)).toEqual([]);
  });
});

describe("QR modül dizileri", () => {
  const matris = QRCode.create("https://ornek.test/f/kafe/4", {
    errorCorrectionLevel: "M",
  }).modules;

  it("dizilerden geri kurulan matris aslıyla birebir aynıdır", () => {
    // Asıl risk burada: bir kayma ya da eksik modül QR'ı okunmaz yapar ve
    // bu ancak baskıdan sonra, masada telefonla fark edilir.
    const kurulan = new Uint8Array(matris.size * matris.size);
    for (const dizi of modulDizileri(matris)) {
      for (let i = 0; i < dizi.uzunluk; i++) {
        kurulan[dizi.satir * matris.size + dizi.sutun + i] = 1;
      }
    }
    for (let i = 0; i < kurulan.length; i++) {
      expect(Boolean(kurulan[i]), `modül ${i} uyuşmuyor`).toBe(
        Boolean(matris.data[i]),
      );
    }
  });

  it("sol üst köşedeki hizalama karesini ilk satırda bulur", () => {
    // QR'ın sol üstünde 7 modüllük dolu bir kenar vardır. Matris ters
    // çevrilseydi bu dizi ilk satırda çıkmazdı.
    const ilkSatir = modulDizileri(matris).filter((d) => d.satir === 0);
    expect(ilkSatir[0]).toMatchObject({ sutun: 0, uzunluk: 7 });
  });

  it("her modülü ayrı çizmek yerine birleştirir", () => {
    const koyuSayisi = [...matris.data].filter(Boolean).length;
    expect(modulDizileri(matris).length).toBeLessThan(koyuSayisi);
  });
});

describe("sayfa yerleşimi", () => {
  it("bir sayfaya sığan kart sayısı kadar kutu üretir", () => {
    expect(kartKutulari()).toHaveLength(SAYFA_BASINA);
  });

  it("kutular sayfa sınırlarının içinde kalır", () => {
    for (const kutu of kartKutulari()) {
      expect(kutu.x).toBeGreaterThanOrEqual(0);
      expect(kutu.y).toBeGreaterThanOrEqual(0);
      expect(kutu.x + kutu.g).toBeLessThanOrEqual(595.28);
      expect(kutu.y + kutu.y_).toBeLessThanOrEqual(841.89);
    }
  });

  it("ilk kutu en üst satırdadır", () => {
    // Kartların okuma sırası soldan sağa, yukarıdan aşağı olmalı.
    const kutular = kartKutulari();
    expect(kutular[0].y).toBeGreaterThan(kutular[kutular.length - 1].y);
  });
});

describe("PDF üretimi", () => {
  const kartlar = (adet: number) =>
    Array.from({ length: adet }, (_, i) => ({
      etiket: `Masa ${i + 1}`,
      url: `https://ornek.test/f/kafe/${i + 1}`,
    }));

  it("geçerli bir PDF başlığı ve sonu üretir", async () => {
    const pdf = await qrPdfUret({
      isletmeAdi: "KESKİNLEZZETLER",
      cagriMetni: "Deneyiminizi değerlendirin",
      markaRengi: "#b91c1c",
      kartlar: kartlar(3),
    });
    const metin = pdf.toString("latin1");
    expect(metin.startsWith("%PDF-1.4")).toBe(true);
    expect(metin.trimEnd().endsWith("%%EOF")).toBe(true);
  });

  it("xref konumları gerçek bayt konumlarını gösterir", async () => {
    // Yanlış xref'te dosya bazı okuyucularda hiç açılmaz; en sinsi hata bu.
    const pdf = await qrPdfUret({
      isletmeAdi: "Kafe",
      cagriMetni: "Menü",
      markaRengi: "#111827",
      kartlar: kartlar(1),
    });
    const metin = pdf.toString("latin1");

    const startxref = Number(/startxref\n(\d+)/.exec(metin)?.[1]);
    expect(metin.slice(startxref, startxref + 4)).toBe("xref");

    const satirlar = metin.slice(startxref).split("\n");
    // 0. satır "xref", 1. satır "0 N", 2. satır boş nesne girdisi.
    const adet = Number(satirlar[1].split(" ")[1]);
    for (let i = 1; i < adet; i++) {
      const konum = Number(satirlar[2 + i].slice(0, 10));
      expect(metin.slice(konum, konum + `${i} 0 obj`.length)).toBe(`${i} 0 obj`);
    }
  });

  it("dokuzdan fazla kart için ikinci sayfa açar", async () => {
    const pdf = await qrPdfUret({
      isletmeAdi: "Kafe",
      cagriMetni: "Menü",
      markaRengi: "#111827",
      kartlar: kartlar(SAYFA_BASINA + 1),
    });
    expect(pdf.toString("latin1")).toContain("/Count 2");
  });

  it("masa yokken bile açılabilir bir dosya döner", async () => {
    // Boş sayfa, bozuk dosyadan iyi: patron "PDF açılmıyor" demesin.
    const pdf = await qrPdfUret({
      isletmeAdi: "Kafe",
      cagriMetni: "Menü",
      markaRengi: "#111827",
      kartlar: [],
    });
    expect(pdf.toString("latin1")).toContain("/Count 1");
  });

  it("QR'ı vektörel çizer, görsel gömmez", async () => {
    const pdf = await qrPdfUret({
      isletmeAdi: "Kafe",
      cagriMetni: "Menü",
      markaRengi: "#111827",
      kartlar: kartlar(1),
    });
    const metin = pdf.toString("latin1");
    // Raster gömülseydi bir XObject/Image sözlüğü olurdu.
    expect(metin).not.toContain("/Image");
    expect(metin).toContain(" re f");
  });
});
