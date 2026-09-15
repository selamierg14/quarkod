import { beforeAll, describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { BILET_SURESI_SN, sifreBiletiCoz, sifreBiletiUret } from "./sifre-bileti";
import { appJetonUret } from "./app-oturum";

/**
 * Şifre sıfırlama bileti.
 *
 * Bilet, "bu kişi SMS kodunu doğruladı" olgusunun üç ekran arasında
 * taşınması. Sahtesi üretilebilseydi ya da başka bir jeton bilet yerine
 * geçebilseydi, kurtarma akışı kodu hiç bilmeyen birine açılırdı — yani
 * herkesin hesabı herkese açık olurdu.
 */

beforeAll(() => {
  // Bilet AUTH_SECRET ile imzalanıyor; test ortamında da tanımlı olmalı.
  process.env.AUTH_SECRET ||= "test-icin-yeterince-uzun-bir-gizli-anahtar";
});

const KULLANICI = "app-kullanici-1";

describe("bilet kesme ve çözme", () => {
  it("kesilen bilet aynı kullanıcıyı geri veriyor", async () => {
    const bilet = await sifreBiletiUret(KULLANICI);
    expect(await sifreBiletiCoz(bilet)).toEqual({ appUserId: KULLANICI });
  });

  it("ömrü kodunkiyle aynı: 3 dakika", async () => {
    // Doğrulanmış bir kodun açtığı pencere, kodun kendi penceresinden
    // uzun olmamalı.
    expect(BILET_SURESI_SN).toBe(180);
  });

  it("bozuk bilet null — istisna fırlatmıyor", async () => {
    // İstisna fırlatsaydı istek 500'e düşerdi; bozuk girdi 400 almalı.
    expect(await sifreBiletiCoz("")).toBeNull();
    expect(await sifreBiletiCoz("bu-bir-jwt-degil")).toBeNull();
    expect(await sifreBiletiCoz("a.b.c")).toBeNull();
  });

  it("imzası BAŞKA anahtarla atılmış bilet reddediliyor", async () => {
    const sahte = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(KULLANICI)
      .setAudience("biyerlere-sifre-sifirlama")
      .setIssuedAt()
      .setExpirationTime("3m")
      .sign(new TextEncoder().encode("saldirganin-kendi-uydurdugu-anahtar"));

    expect(await sifreBiletiCoz(sahte)).toBeNull();
  });

  it("süresi dolmuş bilet reddediliyor", async () => {
    const eski = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(KULLANICI)
      .setAudience("biyerlere-sifre-sifirlama")
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode(process.env.AUTH_SECRET!));

    expect(await sifreBiletiCoz(eski)).toBeNull();
  });
});

describe("jeton türleri birbirinin yerine geçmiyor", () => {
  /**
   * Testin en önemli maddesi. İki jeton da AYNI anahtarla imzalanıyor;
   * ayrım yalnızca `aud` iddiasında. O kontrol bir gün düşerse:
   *
   *   - oturum jetonu bilet yerine geçseydi, giriş yapmış herkes
   *     kimsenin koduna ihtiyaç duymadan şifre sıfırlayabilirdi;
   *   - bilet oturum jetonu yerine geçseydi, kodu doğrulayan kişi şifreyi
   *     hiç değiştirmeden doğrudan hesaba girebilirdi.
   */
  it("OTURUM jetonu bilet olarak kabul edilmiyor", async () => {
    const oturum = await appJetonUret({
      id: KULLANICI,
      username: "deneme",
      name: "Deneme",
    });
    expect(await sifreBiletiCoz(oturum)).toBeNull();
  });

  it("BİLET oturum jetonu olarak kabul edilmiyor", async () => {
    const { appJetonCoz } = await import("./app-oturum");
    const bilet = await sifreBiletiUret(KULLANICI);
    expect(await appJetonCoz(bilet)).toBeNull();
  });
});
