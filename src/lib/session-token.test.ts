import { beforeAll, describe, expect, it } from "vitest";
import {
  ROLLER,
  createSessionToken,
  gecerliRolMu,
  sessionRevokedReason,
  verifySessionToken,
  type SessionCheck,
} from "./session-token";

/**
 * Oturum jetonu 12 saat yaşıyor. İmzaya bakmakla yetinilseydi bu süre
 * boyunca yapılan yönetim işlemleri hiçbir işe yaramazdı; buradaki her
 * kırmızı, "yetkisi alınan kişi hâlâ içeride" demektir.
 */

const SAAT = 3600;
const simdi = Math.floor(Date.now() / 1000);

function kullanici(over: Partial<SessionCheck> = {}): SessionCheck {
  return {
    active: true,
    role: "owner",
    accountId: "hesap-1",
    accountActive: true,
    passwordChangedAt: null,
    ...over,
  };
}

describe("sessionRevokedReason", () => {
  it("sağlam kullanıcıyı kabul eder", () => {
    expect(sessionRevokedReason(kullanici(), simdi)).toBeNull();
  });

  it("pasifleştirilen kullanıcıyı hemen dışarı atar", () => {
    expect(sessionRevokedReason(kullanici({ active: false }), simdi)).toBe(
      "kullanıcı pasif",
    );
  });

  it("askıya alınan hesabın kullanıcısını dışarı atar", () => {
    // Ödemesi kesilen kiracı, jetonu dolana kadar panelde kalamamalı.
    expect(sessionRevokedReason(kullanici({ accountActive: false }), simdi)).toBe(
      "hesap askıda",
    );
  });

  it("platform yöneticisi hesaba bağlı olmadığı için etkilenmez", () => {
    const sysadmin = kullanici({
      role: "superadmin",
      accountId: null,
      accountActive: null,
    });
    expect(sessionRevokedReason(sysadmin, simdi)).toBeNull();
  });

  it("hesabı düşen normal kullanıcıyı kapsamsız bırakmaz", () => {
    expect(sessionRevokedReason(kullanici({ accountId: null }), simdi)).toBe(
      "hesapsız kullanıcı",
    );
  });

  it("şifre değişiminden önceki jetonu yakar", () => {
    // Şifresi çalınan kullanıcı şifresini değiştirdiğinde saldırganın açık
    // oturumu da kapanmalı; asıl amacı bu.
    const eskiJeton = simdi - 2 * SAAT;
    const degisim = new Date((simdi - SAAT) * 1000);
    expect(
      sessionRevokedReason(kullanici({ passwordChangedAt: degisim }), eskiJeton),
    ).toBe("şifre değişti");
  });

  it("şifre değişiminden sonraki jetonu kabul eder", () => {
    // Kullanıcı kendi şifresini değiştirdiğinde kendi oturumu tazelenir.
    const yeniJeton = simdi;
    const degisim = new Date((simdi - SAAT) * 1000);
    expect(
      sessionRevokedReason(kullanici({ passwordChangedAt: degisim }), yeniJeton),
    ).toBeNull();
  });

  it("silinen kullanıcıyı reddeder", () => {
    expect(sessionRevokedReason(null, simdi)).toBe("kullanıcı yok");
  });
});

describe("jeton rolleri", () => {
  // Jeton imzası için gerekli; testte gerçek .env okunmuyor.
  beforeAll(() => {
    process.env.AUTH_SECRET = "test-icin-yeterince-uzun-bir-anahtar-0123456789";
  });

  it("tanımlı her rolü kabul eder", async () => {
    // Rol listesi iki yerde ayrı yazıldığında yeni eklenen rol (viewer,
    // bölge müdürü) giriş yapıyor ama sonraki istekte sessizce dışarı
    // atılıyordu: kullanıcı "şifrem yanlış" sanıyordu.
    for (const role of ROLLER) {
      const jeton = await createSessionToken({
        moduller: [],
        id: "u1",
        name: "Test",
        email: "t@example.com",
        role,
        accountId: role === "superadmin" ? null : "hesap-1",
        businessId: null,
      });
      const cozulen = await verifySessionToken(jeton);
      expect(cozulen?.role, `${role} rolü reddedildi`).toBe(role);
    }
  });

  it("tanımsız rolü reddeder", () => {
    expect(gecerliRolMu("kasiyer")).toBe(false);
    expect(gecerliRolMu("viewer")).toBe(false);
  });
});
