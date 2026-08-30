import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { sifreSorunu } from "@/lib/sifre";
import { usernameProblem } from "@/lib/username";
import { appJetonUret } from "@/lib/app-oturum";
import { apiHata, govdeOku, metin } from "@/lib/app-api";

export const dynamic = "force-dynamic";

/**
 * Biyerlere hesabı açar.
 *
 * Panelin kullanıcı ekleme akışından (kullanicilar/actions.ts) ayrı:
 * orada bir yönetici başkasına hesap açıyor ve rol/işletme atıyor, burada
 * kişi kendi hesabını açıyor ve hiçbir işletmeye bağlı değil.
 *
 * Kullanıcı adı ve şifre kuralları panelle AYNI kaynaktan (lib/username.ts,
 * lib/sifre.ts) geliyor — iki yerde iki farklı kural, "panelde kabul edilen
 * şifre uygulamada reddediliyor" gibi açıklanamaz farklar üretirdi.
 */
export async function POST(request: Request) {
  const govde = await govdeOku(request);
  if (!govde) return apiHata("Geçersiz istek gövdesi.", 400);

  const username = metin(govde, "username").toLowerCase();
  const sifre = metin(govde, "sifre");
  const name = metin(govde, "name").slice(0, 80);

  if (!name) return apiHata("Ad gerekli.", 400);

  const adSorunu = usernameProblem(username);
  if (adSorunu) return apiHata(adSorunu, 400);

  const sifreHatasi = sifreSorunu(sifre);
  if (sifreHatasi) return apiHata(sifreHatasi, 400);

  if (await prisma.appUser.findUnique({ where: { username } })) {
    return apiHata(`"${username}" kullanıcı adı zaten alınmış.`, 409);
  }

  let kullanici;
  try {
    kullanici = await prisma.appUser.create({
      data: {
        username,
        name,
        passwordHash: await hashPassword(sifre),
        passwordChangedAt: new Date(),
      },
      select: { id: true, username: true, name: true, puan: true },
    });
  } catch {
    // Ön kontrol ile INSERT arasında başka bir istek aynı adı almış
    // olabilir; veritabanının tekillik hatası da aynı mesaja düşsün.
    return apiHata(`"${username}" kullanıcı adı zaten alınmış.`, 409);
  }

  return NextResponse.json(
    { jeton: await appJetonUret(kullanici), kullanici },
    { status: 201 },
  );
}
