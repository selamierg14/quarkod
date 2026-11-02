import { describe, expect, it } from "vitest";
import {
  MAX_ANKET_BYTES,
  MAX_COVER_BYTES,
  MAX_LOGO_BYTES,
  MAX_MENU_BYTES,
  MAX_RAW_UPLOAD_BYTES,
  imzaUyuyorMu,
  validateImageDataUrl,
} from "./image";

/** Türlerin gerçek dosya imzaları — sunucu artık öneki değil bunları doğruluyor. */
const IMZALAR: Record<string, number[]> = {
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  "image/jpeg": [0xff, 0xd8, 0xff, 0xe0],
  // "RIFF" + 4 bayt boyut + "WEBP"
  "image/webp": [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50],
};

/**
 * Verilen bayt boyutunda sahte bir data URI. Başında türün gerçek imzası
 * var; `govdeTuru` verilirse önek bir türü, içerik başka bir türü taşır.
 */
function fakeDataUrl(mime: string, bytes: number, govdeTuru: string = mime): string {
  const veri = Buffer.alloc(bytes);
  Buffer.from(IMZALAR[govdeTuru] ?? []).copy(veri);
  return `data:${mime};base64,${veri.toString("base64")}`;
}

/** Gerçek bir GIF'in ilk baytları ("GIF89a"). */
const GIF_BASI = Buffer.from("GIF89a\x01\x00\x01\x00", "latin1");

describe("validateImageDataUrl", () => {
  it("küçük PNG/JPEG/WebP kabul eder", () => {
    expect(validateImageDataUrl(fakeDataUrl("image/png", 5000), "logo")).toBeNull();
    expect(validateImageDataUrl(fakeDataUrl("image/jpeg", 5000), "logo")).toBeNull();
    expect(validateImageDataUrl(fakeDataUrl("image/webp", 5000), "cover")).toBeNull();
  });

  it("izin verilmeyen biçimi reddeder", () => {
    // SVG script taşıyabildiği için bilerek dışarıda.
    expect(validateImageDataUrl(fakeDataUrl("image/svg+xml", 500), "logo")).not.toBeNull();
    expect(validateImageDataUrl(fakeDataUrl("image/gif", 500), "logo")).not.toBeNull();
    expect(validateImageDataUrl("düpedüz metin", "logo")).not.toBeNull();
  });

  /**
   * Önek bir beyan; kanıt dosyanın imzası. QA'da bir GIF yüklenip
   * önizlendi — istek elle kurulursa "data:image/png" etiketiyle her şey
   * gönderilebiliyordu.
   */
  it("öneki doğru ama içeriği başka türde olanı reddeder", () => {
    const gifPngKiligindan = `data:image/png;base64,${Buffer.concat([GIF_BASI, Buffer.alloc(200)]).toString("base64")}`;
    expect(validateImageDataUrl(gifPngKiligindan, "duyuru")).not.toBeNull();
    // PNG etiketiyle JPEG içerik de tutarsız.
    expect(validateImageDataUrl(fakeDataUrl("image/png", 500, "image/jpeg"), "logo")).not.toBeNull();
    // Hiç imzası olmayan rastgele veri.
    expect(validateImageDataUrl(`data:image/webp;base64,${"A".repeat(400)}`, "logo")).not.toBeNull();
  });

  it("imza kontrolü yalnızca baştaki baytlara bakar", () => {
    expect(imzaUyuyorMu("png", fakeDataUrl("image/png", 50).split(",")[1])).toBe(true);
    expect(imzaUyuyorMu("webp", fakeDataUrl("image/webp", 50).split(",")[1])).toBe(true);
    expect(imzaUyuyorMu("jpeg", fakeDataUrl("image/webp", 50).split(",")[1])).toBe(false);
    expect(imzaUyuyorMu("png", "")).toBe(false);
  });

  it("boyut sınırını aşanı reddeder", () => {
    const cokBuyuk = fakeDataUrl("image/png", MAX_LOGO_BYTES + 10_000);
    expect(validateImageDataUrl(cokBuyuk, "logo")).not.toBeNull();
  });

  it("kapak için sınır logodan yüksektir", () => {
    // Logoyu aşan ama kapak sınırının altındaki bir görsel: logo RET, kapak OK.
    const orta = fakeDataUrl("image/webp", MAX_LOGO_BYTES + 50_000);
    expect(validateImageDataUrl(orta, "logo")).not.toBeNull();
    expect(validateImageDataUrl(orta, "cover")).toBeNull();
  });
});

describe("MAX_RAW_UPLOAD_BYTES", () => {
  it("tam olarak 10 MB", () => {
    // ImageUpload.tsx bu sabiti, kullanıcının seçtiği ham dosyayı canvas'a
    // çizmeden önce reddetmek için kullanıyor — tüm görsel alanlarında
    // (logo, kapak, ürün, anket kanıtı) ortak, tek bir üst sınır olmalı.
    expect(MAX_RAW_UPLOAD_BYTES).toBe(10 * 1024 * 1024);
  });

  it("her alanın işlenmiş görsel sınırından büyük", () => {
    // Ham dosya sınırı her zaman sıkıştırılmış sonuç sınırından geniş olmalı;
    // aksi hâlde küçültme sonrası bile geçerli bir görsel reddedilebilirdi.
    for (const limit of [MAX_LOGO_BYTES, MAX_COVER_BYTES, MAX_MENU_BYTES, MAX_ANKET_BYTES]) {
      expect(MAX_RAW_UPLOAD_BYTES).toBeGreaterThan(limit);
    }
  });
});
