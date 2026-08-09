import { describe, expect, it } from "vitest";
import {
  MAX_LOGO_BYTES,
  validateImageDataUrl,
} from "./image";

/** Verilen bayt boyutunu üretecek uzunlukta sahte bir base64 data URI. */
function fakeDataUrl(mime: string, bytes: number): string {
  // base64 uzunluğu ≈ bytes * 4/3
  const base64Len = Math.ceil((bytes * 4) / 3);
  return `data:${mime};base64,${"A".repeat(base64Len)}`;
}

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
