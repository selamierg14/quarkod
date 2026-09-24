import { beforeAll, describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { appJetonCoz, appJetonUret, APP_OTURUM_SURESI } from "./app-oturum";

/**
 * Sıkı jeton doğrulaması.
 *
 * Bu testlerdeki jetonların HEPSİ doğru anahtarla imzalanmış — yani
 * dışarıdan sahtelenemezler. Varlık sebepleri anahtarın bir gün sızması:
 * o durumda "anahtarı değiştir, eski jetonlar düşer" varsayımının
 * çökmemesi gerekiyor. Dördü de önceki doğrulamada KABUL ediliyordu
 * (canlı denendi).
 */

beforeAll(() => {
  process.env.AUTH_SECRET ||= "test-icin-yeterince-uzun-bir-gizli-anahtar-0000";
});

const anahtar = () => new TextEncoder().encode(process.env.AUTH_SECRET!);
const simdi = () => Math.floor(Date.now() / 1000);

async function imzala(ayar: (j: SignJWT) => SignJWT) {
  const temel = new SignJWT({ username: "u", name: "n" })
    .setSubject("k1")
    .setAudience("biyerlere-app")
    .setJti(crypto.randomUUID());
  return ayar(temel).sign(anahtar());
}

describe("sıkı doğrulama", () => {
  it("normal üretilmiş jeton geçiyor ve jti taşıyor", async () => {
    const cozulen = await appJetonCoz(await appJetonUret({ id: "k1", username: "u", name: "n" }));
    expect(cozulen?.id).toBe("k1");
    expect(cozulen?.jti).toBeTruthy();
  });

  it("iat'ı GELECEKTE jeton reddediliyor", async () => {
    // En tehlikelisi: şifre değişince eski oturumlar "iat, değişiklikten
    // önce mi" sorusuyla düşürülüyor; geleceğe tarihli jeton hep "hayır" der.
    const j = await imzala((t) =>
      t.setProtectedHeader({ alg: "HS256" }).setIssuedAt(simdi() + 86400 * 3650).setExpirationTime(simdi() + 86400 * 3651),
    );
    expect(await appJetonCoz(j)).toBeNull();
  });

  it("exp taşımayan jeton reddediliyor", async () => {
    const j = await imzala((t) => t.setProtectedHeader({ alg: "HS256" }).setIssuedAt());
    expect(await appJetonCoz(j)).toBeNull();
  });

  it("azami ömrü aşan jeton reddediliyor (exp ne derse desin)", async () => {
    const j = await imzala((t) =>
      t.setProtectedHeader({ alg: "HS256" })
        .setIssuedAt(simdi() - APP_OTURUM_SURESI - 3600)
        .setExpirationTime(simdi() + 86400 * 365),
    );
    expect(await appJetonCoz(j)).toBeNull();
  });

  it("HS256 dışındaki algoritma reddediliyor", async () => {
    const j = await imzala((t) => t.setProtectedHeader({ alg: "HS512" }).setIssuedAt().setExpirationTime("1h"));
    expect(await appJetonCoz(j)).toBeNull();
  });

  it("jti taşımayan jeton reddediliyor — iptal edilemeyeni kabul etmiyoruz", async () => {
    const j = await new SignJWT({ username: "u", name: "n" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("k1")
      .setAudience("biyerlere-app")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(anahtar());
    expect(await appJetonCoz(j)).toBeNull();
  });
});
