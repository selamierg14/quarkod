import { afterEach, describe, expect, it } from "vitest";
import { GET as aasa } from "@/app/.well-known/apple-app-site-association/route";
import { GET as assetlinks } from "@/app/.well-known/assetlinks.json/route";

/**
 * Evrensel bağlantı doğrulama dosyaları.
 *
 * Bu iki dosyanın YANLIŞ içerikle yayınlanması, hiç yayınlanmamasından
 * kötü: hem Apple hem Android sonucu bir süre önbelleğe alıyor, yani
 * yanlış bir kimlikle bir kez yayına çıkmak, düzeltildikten sonra bile
 * bağlantıların günlerce çalışmaması demek. Testler bu yüzden "kimlik
 * yoksa 404" davranışına odaklanıyor.
 */

const ESKI = { ...process.env };
afterEach(() => {
  process.env = { ...ESKI };
});

describe("apple-app-site-association", () => {
  it("TEAM ID yoksa dosya yayınlanmıyor", async () => {
    delete process.env.IOS_TEAM_ID;
    expect((await aasa()).status).toBe(404);
  });

  it("TEAM ID varsa appID ve yol deseni doğru", async () => {
    process.env.IOS_TEAM_ID = "ABCDE12345";
    const yanit = await aasa();
    expect(yanit.status).toBe(200);
    // Apple dosyayı yalnızca application/json olarak kabul ediyor.
    expect(yanit.headers.get("content-type")).toContain("application/json");

    const govde = await yanit.json();
    const detay = govde.applinks.details[0];
    expect(detay.appIDs).toEqual(["ABCDE12345.com.quarkod.biyerlere"]);
    // Siteyi tamamen devralmıyor: yalnızca mekan sayfaları.
    expect(detay.components[0]["/"]).toBe("/mekan/*");
  });
});

describe("assetlinks.json", () => {
  const GECERLI =
    "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99";

  it("parmak izi yoksa dosya yayınlanmıyor", async () => {
    delete process.env.ANDROID_SHA256_FINGERPRINTS;
    expect((await assetlinks()).status).toBe(404);
  });

  it("BİÇİMİ BOZUK parmak izi yok sayılıyor", async () => {
    // Elle girilen bir değerde eksik bayt ya da fazladan boşluk olabiliyor;
    // bozuk bir izle yayınlamak doğrulamayı sessizce düşürürdü.
    process.env.ANDROID_SHA256_FINGERPRINTS = "AA:BB:CC, kisa, 12345";
    expect((await assetlinks()).status).toBe(404);
  });

  it("birden fazla parmak izi kabul ediliyor", async () => {
    // Play Store'un yeniden imzaladığı sürümle geliştirme derlemesinin
    // izleri farklı; ikisi de listede olmalı.
    process.env.ANDROID_SHA256_FINGERPRINTS = `${GECERLI}, ${GECERLI.toLowerCase()}`;
    const govde = await (await assetlinks()).json();
    expect(govde[0].target.sha256_cert_fingerprints).toHaveLength(2);
    expect(govde[0].target.package_name).toBe("com.quarkod.biyerlere");
  });
});
