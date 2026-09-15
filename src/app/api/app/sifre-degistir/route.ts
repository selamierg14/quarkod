import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/cekirdek/db";
import { apiHata, appKullaniciGerekli, govdeOku, metin } from "@/lib/kimlik/app-api";
import { alanDogrula } from "@/lib/cekirdek/desenler";
import { yeniSifreSorunu } from "@/lib/kimlik/sifre";
import { hashPassword } from "@/lib/kimlik/auth";
import { SINIRLAR, hizSiniriMesaji, hizSiniriUygula } from "@/lib/kimlik/hiz-siniri";

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

  /**
   * Mevcut şifre bcrypt'e GİRMEDEN uzunluk sınırına takılıyor: bcrypt'in
   * maliyeti girdiyle artıyor, megabaytlık bir "mevcut şifre" tek istekte
   * sunucuyu meşgul edebilirdi.
   *
   * Tür `girisSifresi` (asgari uzunluk yok), `sifre` değil: kural
   * sıkılaşmadan önce açılmış hesapların şifreleri daha kısa olabilir ve
   * onları BURADA reddetmek, düzeltmenin tek yolunu kapatmak olurdu.
   */
  const mevcut = alanDogrula(metin(govde, "mevcutSifre"), "girisSifresi", "Mevcut şifre", {
    zorunlu: true,
  });
  if (!mevcut.ok) return apiHata("Mevcut şifre hatalı.", 400);

  // Şifre deneme hızı sınırlı: açık bırakılmış bir oturumu bulan kişi
  // mevcut şifreyi bu uçtan deneyerek aramasın.
  const sinir = await hizSiniriUygula(SINIRLAR.otpDeneme, oturum.kullanici.id);
  if (!sinir.izin) return apiHata(hizSiniriMesaji(sinir), 429);

  const kullanici = await prisma.appUser.findUnique({
    where: { id: oturum.kullanici.id },
    select: { passwordHash: true },
  });
  if (!kullanici) return apiHata("Hesap bulunamadı.", 404);

  if (!(await bcrypt.compare(mevcut.deger, kullanici.passwordHash))) {
    return apiHata("Mevcut şifre hatalı.", 400);
  }

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
