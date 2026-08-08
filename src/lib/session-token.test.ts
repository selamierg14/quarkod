import { beforeAll, describe, expect, it } from "vitest";
import {
  createSessionToken,
  verifySessionToken,
  type SessionUser,
} from "./session-token";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-icin-yeterince-uzun-bir-anahtar-1234567890";
});

const OWNER: SessionUser = {
  id: "u1",
  name: "Sahip",
  email: "sahip@a.com",
  role: "owner",
  accountId: "hesap-a",
  businessId: null,
};

describe("oturum jetonu", () => {
  it("hesap kimliğini taşır ve geri verir", async () => {
    const token = await createSessionToken(OWNER);
    const session = await verifySessionToken(token);
    expect(session?.accountId).toBe("hesap-a");
    expect(session?.role).toBe("owner");
  });

  it("kurcalanmış jetonu reddeder", async () => {
    const token = await createSessionToken(OWNER);
    // İmza doğrulaması bozulmalı: hesabı değiştirmeye çalışan bir saldırı.
    const bozuk = token.slice(0, -3) + "AAA";
    expect(await verifySessionToken(bozuk)).toBeNull();
  });

  it("başka anahtarla imzalanmış jetonu reddeder", async () => {
    const token = await createSessionToken(OWNER);
    process.env.AUTH_SECRET = "bambaska-bir-anahtar-1234567890-abcdef";
    expect(await verifySessionToken(token)).toBeNull();
    process.env.AUTH_SECRET = "test-icin-yeterince-uzun-bir-anahtar-1234567890";
  });

  it("hesapsız owner oturumunu reddeder", async () => {
    // accountId'si olmayan bir owner, kapsamsız sorgulara yol açardı.
    const token = await createSessionToken({ ...OWNER, accountId: null });
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("hesapsız manager oturumunu reddeder", async () => {
    const token = await createSessionToken({
      ...OWNER,
      role: "manager",
      accountId: null,
      businessId: "isletme-1",
    });
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("superadmin hesapsız olabilir", async () => {
    const token = await createSessionToken({
      ...OWNER,
      role: "superadmin",
      accountId: null,
    });
    const session = await verifySessionToken(token);
    expect(session?.role).toBe("superadmin");
    expect(session?.accountId).toBeNull();
  });

  it("tanınmayan rolü reddeder", async () => {
    const token = await createSessionToken({
      ...OWNER,
      role: "platform_tanri" as never,
    });
    expect(await verifySessionToken(token)).toBeNull();
  });
});
