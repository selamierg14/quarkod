import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkLoginAllowed, recordLoginAttempt } from "@/lib/login-guard";
import { appJetonUret } from "@/lib/app-oturum";
import { apiHata, govdeOku, metin } from "@/lib/app-api";
import { plusGecerliMi } from "@/lib/biyerlere-plus";

export const dynamic = "force-dynamic";

/**
 * Biyerlere girişi.
 *
 * Kaba kuvvet koruması panelle aynı sayaçtan (lib/login-guard.ts) geçiyor:
 * kullanıcı adı başına 6, IP başına 20 hatalı deneme / 10 dakika. Bu uç
 * panelden farklı olarak internete tamamen açık ve mobil uygulamadan
 * çağrıldığı için korumasız bırakmak sözlük saldırısına davetiye olurdu.
 */
export async function POST(request: Request) {
  const govde = await govdeOku(request);
  if (!govde) return apiHata("Geçersiz istek gövdesi.", 400);

  const username = metin(govde, "username").toLowerCase();
  const sifre = metin(govde, "sifre");
  if (!username || !sifre) return apiHata("Kullanıcı adı ve şifre gerekli.", 400);

  const izin = await checkLoginAllowed(username);
  if (!izin.allowed) {
    return apiHata(
      `Çok fazla hatalı deneme. ${izin.retryAfterMinutes} dakika sonra tekrar deneyin.`,
      429,
    );
  }

  const kullanici = await prisma.appUser.findUnique({ where: { username } });

  // Şifre karşılaştırması kullanıcı bulunamadığında da yapılıyor: aksi
  // halde yanıt süresi "bu kullanıcı adı var mı" sorusunu ele verirdi.
  const sahteKarma = "$2a$10$" + "x".repeat(53);
  const dogru = await bcrypt.compare(sifre, kullanici?.passwordHash ?? sahteKarma);

  if (!kullanici || !dogru || !kullanici.active) {
    await recordLoginAttempt(username, false);
    // Hangi ayrıntının yanlış olduğu (ad mı, şifre mi, hesap askıda mı)
    // bilerek söylenmiyor: bu bilgi saldırgana kullanıcı listesi çıkarır.
    return apiHata("Kullanıcı adı veya şifre hatalı.", 401);
  }

  await recordLoginAttempt(username, true);

  const cuzdandakiKupon = await prisma.coupon.count({
    where: {
      appUserId: kullanici.id,
      used: false,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  return NextResponse.json({
    jeton: await appJetonUret(kullanici),
    kullanici: {
      id: kullanici.id,
      username: kullanici.username,
      name: kullanici.name,
      puan: kullanici.puan,
      referralCode: kullanici.referralCode,
      cuzdandakiKupon,
      plusUyeMi: plusGecerliMi(kullanici),
    },
  });
}
