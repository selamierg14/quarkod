"use server";

import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { denetimYaz } from "@/lib/denetim";
import {
  DENEME_GUN,
  IP_BASINA_GUNLUK_SINIR,
  denemeBitisi,
  kayitSorunu,
} from "@/lib/deneme";
import { BUSINESS_TYPES, DEFAULT_CATEGORIES, type BusinessType } from "@/lib/constants";
import { KVKK_VERSION } from "@/lib/kvkk";
import { normalizePhone, toUsername, usernameProblem } from "@/lib/username";
import { uniqueConstraintMessage } from "@/lib/unique-error";
import { slugIleOlustur } from "@/lib/slug";

export type DenemeState = { error?: string };

/** Ham IP saklanmıyor; sınır kontrolü karma üzerinden yapılıyor. */
async function ipKarmasi(): Promise<string | null> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "";
  return ip ? createHash("sha256").update(ip).digest("hex").slice(0, 32) : null;
}

/**
 * Deneme hesabı açar ve kullanıcıyı doğrudan panele alır.
 *
 * Hesap, işletme ve ilk kullanıcı tek işlemde kuruluyor: yarım kalan bir
 * kayıt (işletmesi olmayan hesap) kullanıcıyı boş bir panele düşürür ve
 * denemenin ilk 30 saniyesini yakar.
 */
export async function denemeBaslat(
  _prev: DenemeState,
  formData: FormData,
): Promise<DenemeState> {
  const girdi = {
    firma: String(formData.get("firma") ?? "").trim(),
    // Kayıtta sorulan işletme türü: panele girdiğinde ona uygun anket
    // kategorileri ve menü şablonu önerilebilsin diye. Boş/tanınmayan
    // değer "yeme_icme"ye düşer — kayıt bu yüzden başarısız olmasın.
    tur: String(formData.get("tur") ?? ""),
    adSoyad: String(formData.get("adSoyad") ?? "").trim(),
    eposta: String(formData.get("eposta") ?? "").trim().toLowerCase(),
    telefon: String(formData.get("telefon") ?? "").trim(),
    kullaniciAdi: String(formData.get("kullaniciAdi") ?? "").trim().toLowerCase(),
    sifre: String(formData.get("sifre") ?? ""),
    kvkkOnay: formData.get("kvkkOnay") === "on",
  };

  const sorun = kayitSorunu(girdi);
  if (sorun) return { error: sorun };

  const telefon = normalizePhone(girdi.telefon);
  if (!telefon) return { error: "Geçerli bir cep telefonu girin (5XX...)." };

  const kullaniciAdi = girdi.kullaniciAdi || toUsername(girdi.eposta.split("@")[0]);
  const adSorunu = usernameProblem(kullaniciAdi);
  if (adSorunu) return { error: adSorunu };

  // Aynı IP'den seri hesap açılmasını sınırla: form açık olduğu için tek
  // koruma e-posta tekilliği olsaydı, sahte adreslerle kolayca doldurulurdu.
  const karma = await ipKarmasi();
  if (karma) {
    const gunOnce = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const adet = await prisma.account.count({
      where: { signupIpHash: karma, createdAt: { gte: gunOnce } },
    });
    if (adet >= IP_BASINA_GUNLUK_SINIR) {
      return {
        error:
          "Bu bağlantıdan bugün çok sayıda deneme hesabı açıldı. Yarın tekrar deneyin ya da bizimle iletişime geçin.",
      };
    }
  }

  if (await prisma.user.findUnique({ where: { email: girdi.eposta } })) {
    return { error: "Bu e-posta zaten kayıtlı. Giriş yapmayı deneyin." };
  }
  if (await prisma.user.findUnique({ where: { username: kullaniciAdi } })) {
    return { error: `"${kullaniciAdi}" kullanıcı adı alınmış, başka bir tane seçin.` };
  }

  const tur: BusinessType =
    girdi.tur in BUSINESS_TYPES ? (girdi.tur as BusinessType) : "yeme_icme";

  const bitis = denemeBitisi();
  // Şifre karması slug denemesinden önce hesaplanıyor: bcrypt pahalı bir
  // iş, adres çakışıp yeniden denendiğinde ikinci kez ödemeye gerek yok.
  const sifreKarmasi = await hashPassword(girdi.sifre);

  let kullanici;
  try {
    // Firma adı serbest metin; iki ayrı kafe aynı adı yazabilir. Adresi
    // veritabanı kararlaştırsın, çakışırsa yeniden denesin — eskiden tek
    // atışlık rastgele bir ek vardı ve tutmazsa kayıt tamamen düşüyordu.
    const hesap = await slugIleOlustur(girdi.firma || girdi.adSoyad, (slug) =>
      prisma.account.create({
      data: {
        name: girdi.firma,
        email: girdi.eposta,
        plan: "deneme",
        expiresAt: bitis,
        // Deneme boyunca QR menü de açık: ürünün tamamını görmeden karar
        // veremiyorlar, kapalı modül "eksik ürün" izlenimi bırakıyor.
        menuEnabled: true,
        // KVKK onayı formda zorunlu; kanıtı burada saklanıyor.
        kvkkOnayAt: new Date(),
        kvkkSurum: KVKK_VERSION,
        signupIpHash: karma,
        businesses: {
          create: {
            name: girdi.firma,
            slug,
            type: tur,
            categories: {
              create: DEFAULT_CATEGORIES[tur].map((name, i) => ({
                name,
                sortOrder: (i + 1) * 10,
              })),
            },
            // Tek masa yeter: kullanıcı ilk QR'ı hemen okutup akışı görsün.
            tables: {
              create: {
                tableNumber: "1",
                qrToken: randomBytes(12).toString("hex"),
              },
            },
          },
        },
        users: {
          create: {
            name: girdi.adSoyad,
            username: kullaniciAdi,
            email: girdi.eposta,
            phone: telefon,
            role: "owner",
            passwordHash: sifreKarmasi,
          },
        },
      },
      include: { users: true },
      }),
    );
    kullanici = hesap.users[0];

    await denetimYaz(
      {
        id: kullanici.id,
        name: kullanici.name,
        role: "owner",
        accountId: hesap.id,
      },
      "account.create",
      {
        accountId: hesap.id,
        entity: "account",
        entityId: hesap.id,
        detail: `${DENEME_GUN} günlük deneme hesabı self-servis açıldı`,
      },
    );
  } catch (error) {
    const mesaj = uniqueConstraintMessage(error);
    if (mesaj) return { error: mesaj };
    throw error;
  }

  await setSessionCookie({
    // Jeton modül taşımaz; etkin küme her istekte DB'den okunuyor.
    moduller: [],
    id: kullanici.id,
    name: kullanici.name,
    email: kullanici.email,
    role: "owner",
    accountId: kullanici.accountId,
    businessId: null,
  });

  redirect("/tesekkurler");
}
