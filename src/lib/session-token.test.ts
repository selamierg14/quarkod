import { describe, expect, it } from "vitest";
import { sessionRevokedReason, type SessionCheck } from "./session-token";

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
