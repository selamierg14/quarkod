import { NextResponse } from "next/server";
import { prisma } from "@/lib/cekirdek/db";
import { apiHata, govdeOku, metin } from "@/lib/kimlik/app-api";
import { alanDogrula } from "@/lib/cekirdek/desenler";
import { sifreSorunu } from "@/lib/kimlik/sifre";
import { hashPassword } from "@/lib/kimlik/auth";
import { SINIRLAR, hizSiniriMesaji, hizSiniriUygula } from "@/lib/kimlik/hiz-siniri";
import { appKodDogrula, appKodGonder, kurtarmaHedefi } from "@/lib/biyerlere/app-otp";

export const dynamic = "force-dynamic";

/**
 * Şifresini unutan tüketicinin hesabını geri alması.
 *
 * Bu akış olmadan hesap KALICI olarak kaybediliyordu: `AppUser` tablosunda
 * hiçbir kurtarma kanalı yoktu, dolayısıyla "şifremi unuttum" yazılamıyordu
 * ve destek de yardım edemiyordu — kişinin o hesabın sahibi olduğunu
 * doğrulayacak hiçbir bilgi yoktu. Puanlar, rozetler, ziyaret geçmişi ve
 * favoriler o hesapla birlikte gidiyordu; kullanıcının uygulamayı bırakma
 * ihtimali en yüksek an tam da orasıydı.
 *
 * İki adım: `POST` kod gönderiyor, `PUT` kodu doğrulayıp şifreyi
 * değiştiriyor.
 *
 * KULLANICI VARLIĞI SIZDIRILMIYOR. Hem "kullanıcı yok", hem "numarası
 * yok", hem "numarası doğrulanmamış" durumları AYNI yanıtı veriyor ve
 * hepsi 200 dönüyor. Aksi halde bu uç, bir kullanıcı adının kayıtlı olup
 * olmadığını sorgulayan bir araca dönüşürdü — panelin şifre sıfırlama
 * akışındaki ilkenin aynısı.
 */

/** Adım 1 — kullanıcı adını al, kayıtlı numaraya kod gönder. */
export async function POST(request: Request) {
  const govde = await govdeOku(request);
  if (!govde) return apiHata("İstek gövdesi okunamadı.", 400);

  const kimlik = alanDogrula(metin(govde, "kullaniciAdi"), "girisKimligi", "Kullanıcı adı");
  if (!kimlik.ok) return apiHata(kimlik.hata, 400);

  // Hız sınırı KULLANICI ADINA göre: kod göndermek SMS maliyeti demek ve
  // bu uç kimlik doğrulaması istemiyor.
  const sinir = await hizSiniriUygula(SINIRLAR.otpDeneme, kimlik.deger.toLowerCase());
  if (!sinir.izin) return apiHata(hizSiniriMesaji(sinir), 429);

  const hedef = await kurtarmaHedefi(kimlik.deger);

  /**
   * Numara İSTEMCİDEN DEĞİL veritabanından geliyor. İstemcinin verdiği bir
   * numaraya kod göndermek, herhangi bir hesabın kurtarma kodunu
   * saldırganın telefonuna yollamak olurdu.
   */
  if (hedef.durum === "hazir") {
    await appKodGonder(hedef.appUserId, "sifre", hedef.telefon);
  }

  // Sonuç ne olursa olsun aynı yanıt.
  return NextResponse.json({
    gonderildi: true,
    maskeli: hedef.durum === "hazir" ? hedef.maskeli : null,
    bilgi:
      "Kullanıcı adına kayıtlı doğrulanmış bir numara varsa kod gönderildi.",
  });
}

/** Adım 2 — kodu doğrula, yeni şifreyi yaz. */
export async function PUT(request: Request) {
  const govde = await govdeOku(request);
  if (!govde) return apiHata("İstek gövdesi okunamadı.", 400);

  const kimlik = alanDogrula(metin(govde, "kullaniciAdi"), "girisKimligi", "Kullanıcı adı");
  const kod = alanDogrula(metin(govde, "kod"), "dogrulamaKodu", "Kod");
  if (!kimlik.ok) return apiHata(kimlik.hata, 400);
  if (!kod.ok) return apiHata(kod.hata, 400);

  const yeniSifre = metin(govde, "yeniSifre");
  const sifreHatasi = sifreSorunu(yeniSifre);
  if (sifreHatasi) return apiHata(sifreHatasi, 400);

  const sinir = await hizSiniriUygula(SINIRLAR.otpDeneme, kimlik.deger.toLowerCase());
  if (!sinir.izin) return apiHata(hizSiniriMesaji(sinir), 429);

  const hedef = await kurtarmaHedefi(kimlik.deger);
  if (hedef.durum !== "hazir") {
    // Burada da ayrım yapılmıyor: geçersiz kod ile "böyle bir kurtarma
    // yok" aynı mesajı veriyor.
    return apiHata("Kod geçersiz ya da süresi dolmuş.", 400);
  }

  const dogrulama = await appKodDogrula(hedef.appUserId, "sifre", kod.deger);
  if (!dogrulama.ok) return apiHata(dogrulama.error, 400);

  await prisma.appUser.update({
    where: { id: hedef.appUserId },
    data: {
      passwordHash: await hashPassword(yeniSifre),
      // Bu andan önce üretilmiş jetonlar düşüyor: şifresini unuttuğunu
      // sanan kullanıcı aslında hesabı ele geçirildiği için giremiyor
      // olabilir — sıfırlama saldırganı da dışarı atmalı.
      passwordChangedAt: new Date(),
    },
  });

  return NextResponse.json({ degistirildi: true });
}
