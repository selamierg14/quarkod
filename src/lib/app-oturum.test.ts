import { beforeAll, describe, expect, it } from "vitest";
import {
  appJetonCoz,
  appJetonUret,
  appOturumIptalSebebi,
  bearerJetonu,
} from "./app-oturum";
import { createSessionToken, verifySessionToken } from "./session-token";

/**
 * Biyerlere (tüketici) oturumu.
 *
 * Bu dosyadaki en önemli testler iki jeton dünyasının birbirine
 * geçmediğini gösterenler: tüketici jetonuyla panele girilebilseydi
 * kiracı izolasyonu tamamen çökerdi.
 */
beforeAll(() => {
  process.env.AUTH_SECRET ??= "test-icin-en-az-otuz-iki-karakterlik-gizli-anahtar";
});

const ORNEK = { id: "app-1", username: "ahmet", name: "Ahmet Yılmaz" };

describe("jeton üretimi ve çözümü", () => {
  it("ürettiğini geri okuyabiliyor", async () => {
    const cozulen = await appJetonCoz(await appJetonUret(ORNEK));
    expect(cozulen?.id).toBe("app-1");
    expect(cozulen?.username).toBe("ahmet");
    expect(cozulen?.name).toBe("Ahmet Yılmaz");
    expect(cozulen?.issuedAt).toBeGreaterThan(0);
  });

  it("bozuk jetonu reddeder", async () => {
    expect(await appJetonCoz("uyduruk")).toBeNull();
    expect(await appJetonCoz("")).toBeNull();
  });

  it("imzası kurcalanmış jetonu reddeder", async () => {
    const jeton = await appJetonUret(ORNEK);
    // Son karakteri değiştirmek imzayı bozar.
    const bozuk = jeton.slice(0, -1) + (jeton.endsWith("A") ? "B" : "A");
    expect(await appJetonCoz(bozuk)).toBeNull();
  });
});

describe("panel ve uygulama jetonları birbirinin yerine geçmez", () => {
  it("PANEL jetonu tüketici tarafında kabul edilmez", async () => {
    // Audience iddiası taşımadığı için appJetonCoz onu reddetmeli.
    const panelJetonu = await createSessionToken({
      id: "u1",
      name: "Personel",
      email: "p@ornek.test",
      role: "owner",
      accountId: "hesap-1",
      businessId: null,
      moduller: [],
    });
    expect(await appJetonCoz(panelJetonu)).toBeNull();
  });

  it("TÜKETİCİ jetonu panel tarafında kabul edilmez", async () => {
    // Geçerli bir `role` iddiası taşımadığı için panel doğrulaması reddeder.
    // Bu yön kapalı olmasaydı bir tüketici, panele girip bütün kiracıların
    // verisini görebilirdi.
    const appJetonu = await appJetonUret(ORNEK);
    expect(await verifySessionToken(appJetonu)).toBeNull();
  });
});

describe("oturum iptali", () => {
  const an = Math.floor(Date.now() / 1000);

  it("aktif kullanıcı geçerli", () => {
    expect(
      appOturumIptalSebebi({ active: true, passwordChangedAt: null }, an),
    ).toBeNull();
  });

  it("kullanıcı yoksa iptal", () => {
    expect(appOturumIptalSebebi(null, an)).toBe("kullanıcı yok");
  });

  it("askıya alınan hesap iptal", () => {
    expect(
      appOturumIptalSebebi({ active: false, passwordChangedAt: null }, an),
    ).toBe("hesap askıda");
  });

  it("şifre değişiminden ÖNCEKİ jeton iptal", () => {
    // Şifresi çalınan kişi şifresini değiştirdiğinde saldırganın 30 günlük
    // jetonu da kapanmalı — bu testin asıl anlamı bu.
    const degisim = new Date((an + 60) * 1000);
    expect(
      appOturumIptalSebebi({ active: true, passwordChangedAt: degisim }, an),
    ).toBe("şifre değişti");
  });

  it("şifre değişiminden SONRAKİ jeton geçerli", () => {
    const degisim = new Date((an - 60) * 1000);
    expect(
      appOturumIptalSebebi({ active: true, passwordChangedAt: degisim }, an),
    ).toBeNull();
  });
});

describe("Bearer başlığı", () => {
  it("jetonu ayıklar", () => {
    expect(bearerJetonu("Bearer abc.def.ghi")).toBe("abc.def.ghi");
  });

  it("büyük/küçük harfe duyarsız", () => {
    expect(bearerJetonu("bearer xyz")).toBe("xyz");
  });

  it("başlık yoksa ya da biçim yanlışsa null", () => {
    expect(bearerJetonu(null)).toBeNull();
    expect(bearerJetonu("")).toBeNull();
    expect(bearerJetonu("Basic abc")).toBeNull();
    expect(bearerJetonu("Bearer")).toBeNull();
    expect(bearerJetonu("Bearer   ")).toBeNull();
  });
});
