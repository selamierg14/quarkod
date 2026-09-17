import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { config } from "dotenv";
config({ path: ".env.local" }); config({ path: ".env" });
import { appJetonUret } from "../../src/lib/kimlik/app-oturum";
import { createSessionToken } from "../../src/lib/kimlik/session-token";

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL }),
  });
  const k = await prisma.appUser.upsert({
    where: { username: "jeton-deneme" },
    update: { active: true, passwordChangedAt: new Date(Date.now() - 3600_000) },
    create: { username: "jeton-deneme", passwordHash: await bcrypt.hash("JetonTest123", 10),
      name: "Jeton Deneme", referralCode: "JTN" + Math.floor(Math.random() * 90000 + 10000),
      passwordChangedAt: new Date(Date.now() - 3600_000) },
  });
  const sir = new TextEncoder().encode(process.env.AUTH_SECRET!);
  const simdi = Math.floor(Date.now() / 1000);
  const govde = { username: k.username, name: k.name };

  const gecerli = await appJetonUret(k);
  const [h, p, s] = gecerli.split(".");
  const yuk = JSON.parse(Buffer.from(p, "base64url").toString());

  const sonuc: Record<string, string> = {
    gecerli,
    suresiGecmis: await new SignJWT(govde).setProtectedHeader({ alg: "HS256" }).setSubject(k.id)
      .setAudience("biyerlere-app").setIssuedAt(simdi - 7200).setExpirationTime(simdi - 60).sign(sir),
    algNone: `${b64({ alg: "none", typ: "JWT" })}.${p}.`,
    yanlisAnahtar: await new SignJWT(govde).setProtectedHeader({ alg: "HS256" }).setSubject(k.id)
      .setAudience("biyerlere-app").setIssuedAt().setExpirationTime("1h")
      .sign(new TextEncoder().encode("saldirganin-uydurdugu-anahtar-000000000000")),
    hs512AyniAnahtar: await new SignJWT(govde).setProtectedHeader({ alg: "HS512" }).setSubject(k.id)
      .setAudience("biyerlere-app").setIssuedAt().setExpirationTime("1h").sign(sir),
    subDegistirilmis: `${h}.${b64({ ...yuk, sub: "baska-kullanici-id" })}.${s}`,
    expsizGecerliImza: await new SignJWT(govde).setProtectedHeader({ alg: "HS256" }).setSubject(k.id)
      .setAudience("biyerlere-app").setIssuedAt().sign(sir),
    gelecektenIat: await new SignJWT(govde).setProtectedHeader({ alg: "HS256" }).setSubject(k.id)
      .setAudience("biyerlere-app").setIssuedAt(simdi + 10 * 365 * 86400).setExpirationTime("1h").sign(sir),
    panelJetonu: await createSessionToken({ moduller: [], id: k.id, name: "x", email: "x@x.com",
      role: "superadmin", accountId: null, businessId: null }),
    sifreBileti: await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(k.id)
      .setAudience("biyerlere-sifre-sifirlama").setIssuedAt().setExpirationTime("3m").sign(sir),
    cokUzunOmur: await new SignJWT(govde).setProtectedHeader({ alg: "HS256" }).setSubject(k.id)
      .setAudience("biyerlere-app").setIssuedAt().setExpirationTime("3650d").sign(sir),
  };
  console.log(JSON.stringify(sonuc));
  await prisma.$disconnect();
}
main();
