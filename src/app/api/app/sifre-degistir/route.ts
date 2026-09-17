import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/cekirdek/db";
import {
  apiHata,
  appKullaniciGerekli,
  govdeOku,
  mevcutSifreyiDogrula,
  metin,
} from "@/lib/kimlik/app-api";
import { yeniSifreSorunu } from "@/lib/kimlik/sifre";
import { hashPassword } from "@/lib/kimlik/auth";

export const dynamic = "force-dynamic";

/**
 * OTURUM İÇİNDE şifre değiştirme — mevcut şifre + yeni şifre (iki kez).
 *
 * TEK ADIM ve SMS YOK. Kimlik kanıtı mevcut şifrenin kendisi: onu bilen
 * kişi zaten hesabın sahibi sayılıyor. Kod istemek ikinci bir faktör
 * eklerdi ama bedeli, şifresini değiştirmek isteyen her kullanıcının SMS
 * beklemesi — ve numarası yoksa hiç değiştirememesi.
 *
 * Kurtarma akışı (`/sifre-kurtar`) ise SMS'siz OLAMAZ: orada mevcut şifre
 * zaten bilinmiyor, elde tek kanıt numaraya ulaşabilmek. İki akışın
 * farkı burada.
 *
 * İKİ KUTU sunucuda da karşılaştırılıyor (`yeniSifreSorunu`). Tarayıcı
 * kontrolü bir kolaylık; istek elle de kurulabilir ve o zaman kullanıcı
 * yazım hatasıyla girdiği şifreye kilitlenirdi.
 */
export async function POST(request: Request) {
  const oturum = await appKullaniciGerekli(request);
  if ("yanit" in oturum) return oturum.yanit;

  const govde = await govdeOku(request);
  if (!govde) return apiHata("İstek gövdesi okunamadı.", 400);

  // Uzunluk → ortak hız sınırı → bcrypt (bkz. mevcutSifreyiDogrula).
  const dogrulama = await mevcutSifreyiDogrula(oturum.kullanici.id, metin(govde, "mevcutSifre"));
  if (!dogrulama.ok) return dogrulama.yanit;

  const kullanici = await prisma.appUser.findUnique({
    where: { id: oturum.kullanici.id },
    select: { passwordHash: true },
  });
  if (!kullanici) return apiHata("Hesap bulunamadı.", 404);

  const yeniSifre = metin(govde, "yeniSifre");
  const sorun = yeniSifreSorunu(yeniSifre, metin(govde, "yeniSifreTekrar"));
  if (sorun) return apiHata(sorun, 400);

  // Aynı şifreyi yeniden yazmak bir değişiklik değil; üstelik tüm
  // oturumları düşürdüğü için kullanıcı hiçbir şey kazanmadan yeniden
  // giriş yapmak zorunda kalırdı.
  if (await bcrypt.compare(yeniSifre, kullanici.passwordHash)) {
    return apiHata("Yeni şifre eskisiyle aynı olamaz.", 400);
  }

  await prisma.appUser.update({
    where: { id: oturum.kullanici.id },
    data: {
      passwordHash: await hashPassword(yeniSifre),
      // Bu andan önceki jetonlar düşüyor — çalınmış oturum da kapansın.
      passwordChangedAt: new Date(),
    },
  });

  return NextResponse.json({
    degistirildi: true,
    // Şifre değişince mevcut jeton da geçersizleşiyor; istemci yeniden
    // giriş yapmalı. Bunu söylemek, sessizce 401'e düşmekten iyi.
    yenidenGirisGerekli: true,
  });
}
