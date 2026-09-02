import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { sifreSorunu } from "@/lib/sifre";
import { usernameProblem } from "@/lib/username";
import { appJetonUret } from "@/lib/app-oturum";
import { apiHata, govdeOku, metin } from "@/lib/app-api";
import { DAVET_ODULU_PUAN, davetKoduBicimiGecerliMi, davetKoduUret } from "@/lib/davet";

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
  const davetKoduHam = metin(govde, "davetKodu").toUpperCase();

  if (!name) return apiHata("Ad gerekli.", 400);

  const adSorunu = usernameProblem(username);
  if (adSorunu) return apiHata(adSorunu, 400);

  const sifreHatasi = sifreSorunu(sifre);
  if (sifreHatasi) return apiHata(sifreHatasi, 400);

  if (await prisma.appUser.findUnique({ where: { username } })) {
    return apiHata(`"${username}" kullanıcı adı zaten alınmış.`, 409);
  }

  // Davet kodu isteğe bağlı: girilmediyse sessizce yok sayılır. Girildiyse
  // ve biçimsel olarak geçerliyse sahibini arıyoruz — bulunamazsa (yanlış
  // yazılmış, silinmiş bir hesaba ait) yine kaydı reddetmiyoruz, sadece
  // ödülsüz devam ediyoruz. Bir daveti yanlış yazan kişiyi kayıttan
  // alıkoymak, ödülü kaçırmasından çok daha kötü bir deneyim olurdu.
  const davetEden =
    davetKoduHam && davetKoduBicimiGecerliMi(davetKoduHam)
      ? await prisma.appUser.findUnique({
          where: { referralCode: davetKoduHam },
          select: { id: true, active: true },
        })
      : null;
  const gecerliDavet = davetEden?.active ? davetEden : null;

  // Kod üretim + tekillik: çakışma pratikte hemen hemen imkansız (6 haneli,
  // 33^6 ≈ 1.29 milyar kombinasyon) ama küçük bir olasılık için birkaç
  // deneme hakkı bırakılıyor. Hangi alanın çakıştığını ayırt ediyoruz:
  // username çakışması kullanıcıya anlamlı bir mesaj olarak dönmeli,
  // referralCode çakışması ise kullanıcının hiç bilmediği bir iç ayrıntı —
  // sessizce yeni bir kod deneyip devam ediyoruz.
  let kullanici;
  for (let deneme = 0; deneme < 5; deneme++) {
    try {
      kullanici = await prisma.$transaction(async (tx) => {
        const yeni = await tx.appUser.create({
          data: {
            username,
            name,
            passwordHash: await hashPassword(sifre),
            passwordChangedAt: new Date(),
            referralCode: davetKoduUret(),
            referredById: gecerliDavet?.id ?? null,
            // Davetle gelen kişi "hoş geldin" puanıyla başlar.
            puan: gecerliDavet ? DAVET_ODULU_PUAN : 0,
          },
          select: { id: true, username: true, name: true, puan: true, referralCode: true },
        });

        if (gecerliDavet) {
          await tx.appUser.update({
            where: { id: gecerliDavet.id },
            data: { puan: { increment: DAVET_ODULU_PUAN } },
          });
        }

        return yeni;
      });
      break;
    } catch (error) {
      const alan = (error as { meta?: { target?: string[] } })?.meta?.target;
      if (alan?.includes("username")) {
        // Ön kontrol ile INSERT arasında başka bir istek aynı adı almış.
        return apiHata(`"${username}" kullanıcı adı zaten alınmış.`, 409);
      }
      // referralCode çakışması (ya da tanınmayan bir hata) — yeniden dene.
      continue;
    }
  }
  if (!kullanici) {
    return apiHata("Kayıt oluşturulamadı, lütfen tekrar deneyin.", 500);
  }

  return NextResponse.json(
    { jeton: await appJetonUret(kullanici), kullanici },
    { status: 201 },
  );
}
