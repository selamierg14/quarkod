import { describe, expect, it } from "vitest";
import { istemciIp } from "./istemci-ip";

/**
 * IP tabanlı her sınırın dayandığı tek fonksiyon.
 *
 * Buradaki hata sessiz ve toptan: sahtelenebilen bir başlığa güvenmek,
 * kayıt, giriş kilidi, anket sel koruması ve deneme hesabı sınırının
 * HEPSİNİ aynı anda etkisiz kılıyordu.
 */

const baslik = (h: Record<string, string>) => ({
  get: (ad: string) => h[ad.toLowerCase()] ?? null,
});
const ortam = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;

describe("üretimde istemcinin yazdığı başlığa güvenilmiyor", () => {
  it("Vercel'de SAHTE x-forwarded-for yok sayılıyor", () => {
    // Testin en önemli maddesi: saldırganın gönderdiği değer kimlik olmamalı.
    const ip = istemciIp(
      baslik({ "x-forwarded-for": "6.6.6.6", "x-vercel-forwarded-for": "31.206.1.1" }),
      ortam({ VERCEL: "1", NODE_ENV: "production" }),
    );
    expect(ip).toBe("31.206.1.1");
  });

  it("Vercel başlığı yoksa x-real-ip", () => {
    expect(
      istemciIp(
        baslik({ "x-forwarded-for": "6.6.6.6", "x-real-ip": "31.206.1.2" }),
        ortam({ VERCEL: "1", NODE_ENV: "production" }),
      ),
    ).toBe("31.206.1.2");
  });

  it("güvenilir kaynak YOKSA ortak kova — sahte değer DEĞİL", () => {
    const ip = istemciIp(
      baslik({ "x-forwarded-for": "6.6.6.6" }),
      ortam({ NODE_ENV: "production" }),
    );
    expect(ip).toBe("guvenilmez");
  });

  it("farklı sahte başlıklar aynı kovaya düşüyor — sınır aşılamıyor", () => {
    const o = ortam({ NODE_ENV: "production" });
    const ipler = new Set(
      ["1.1.1.1", "2.2.2.2", "3.3.3.3"].map((x) => istemciIp(baslik({ "x-forwarded-for": x }), o)),
    );
    expect(ipler.size).toBe(1);
  });

  it("yapılandırılmış vekil başlığı kullanılıyor", () => {
    expect(
      istemciIp(
        baslik({ "x-forwarded-for": "6.6.6.6", "x-real-ip": "10.0.0.9" }),
        ortam({ GUVENILIR_IP_BASLIGI: "X-Real-IP", NODE_ENV: "production" }),
      ),
    ).toBe("10.0.0.9");
  });
});

describe("geliştirme", () => {
  it("yerelde x-forwarded-for okunuyor (koruma değil, kolaylık)", () => {
    expect(
      istemciIp(baslik({ "x-forwarded-for": "::1" }), ortam({ NODE_ENV: "development" })),
    ).toBe("::1");
  });
});
