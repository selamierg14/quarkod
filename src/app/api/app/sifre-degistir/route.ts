import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/cekirdek/db";
import { apiHata, appKullaniciGerekli, govdeOku, metin } from "@/lib/kimlik/app-api";
import { alanDogrula } from "@/lib/cekirdek/desenler";
import { sifreSorunu } from "@/lib/kimlik/sifre";
import { hashPassword } from "@/lib/kimlik/auth";
import { maskPhone } from "@/lib/kimlik/otp";
import { SINIRLAR, hizSiniriMesaji, hizSiniriUygula } from "@/lib/kimlik/hiz-siniri";
import { appKodDogrula, appKodGonder, degistirmeHedefi } from "@/lib/biyerlere/app-otp";

export const dynamic = "force-dynamic";

/**
 * OTURUM İÇİNDE şifre değiştirme — mevcut şifre + SMS kodu.
 *
 * Neden iki faktör: açık bırakılmış bir telefonu eline geçiren kişi,
 * yalnızca "yeni şifre" soran bir ekranla hesabı tek dokunuşta devralır.
 * Panelin kendi şifre değiştirme akışı da aynı sebeple kod istiyor.
 *
 * NUMARA BURADA DA EKLENEBİLİYOR ve bu bilinçli bir tercih. Ayrı bir
 * "kurtarma numarası ekle" ekranı yok; numarası olmayan kullanıcı bu
 * akışta numarasını verip doğruluyor ve aynı kodla şifresini
 * değiştiriyor. Numarayı toplamak için en doğal an bu: kullanıcı zaten
 * hesabının güvenliğiyle ilgileniyor. Ayrı bir ekran olsaydı kimse
 * girmezdi ve kurtarma kanalı kağıt üzerinde kalırdı.
 *
 * İki adım: POST mevcut şifreyi doğrulayıp kod gönderiyor, PUT kodu
 * doğrulayıp yeni şifreyi yazıyor.
 */

/** Adım 1 — mevcut şifreyi doğrula, kodu gönder. */
export async function POST(request: Request) {
  const oturum = await appKullaniciGerekli(request);
  if ("yanit" in oturum) return oturum.yanit;

  const govde = await govdeOku(request);
  if (!govde) return apiHata("İstek gövdesi okunamadı.", 400);

  // Mevcut şifre bcrypt'e GİRMEDEN sınırlanıyor — maliyeti girdiyle artıyor.
  const mevcut = alanDogrula(metin(govde, "mevcutSifre"), "girisSifresi", "Mevcut şifre", {
    zorunlu: true,
  });
  if (!mevcut.ok) return apiHata("Mevcut şifre hatalı.", 400);

  const kullanici = await prisma.appUser.findUnique({
    where: { id: oturum.kullanici.id },
    select: { passwordHash: true, telefon: true, telefonDogrulandi: true },
  });
  if (!kullanici) return apiHata("Hesap bulunamadı.", 404);

  if (!(await bcrypt.compare(mevcut.deger, kullanici.passwordHash))) {
    return apiHata("Mevcut şifre hatalı.", 400);
  }

  // Kodun gideceği numarayı seçen kural app-otp.ts'te ve test edilmiş:
  // kayıtlı doğrulanmış numara varsa istekteki numara yok sayılıyor.
  const hedef = degistirmeHedefi(kullanici, metin(govde, "telefon"));
  if (hedef.durum === "numaraYok") {
    return apiHata(
      "Hesabında doğrulanmış bir numara yok. Şifreni değiştirmek için " +
        "geçerli bir cep telefonu gir (5XX...); kodu oraya göndereceğiz.",
      400,
    );
  }

  if (hedef.durum === "yeni") {
    /**
     * Numara BAŞKA bir hesapta kayıtlıysa reddediliyor — hangi hesap
     * olduğu söylenmeden: "falanca kullanıcıda kayıtlı" demek, numaradan
     * kullanıcı adı öğrenmenin yolu olurdu.
     */
    const sahipli = await prisma.appUser.findUnique({
      where: { telefon: hedef.telefon },
      select: { id: true },
    });
    if (sahipli && sahipli.id !== oturum.kullanici.id) {
      return apiHata("Bu numara başka bir hesapta kayıtlı.", 409);
    }
  }

  const sinir = await hizSiniriUygula(SINIRLAR.otpDeneme, oturum.kullanici.id);
  if (!sinir.izin) return apiHata(hizSiniriMesaji(sinir), 429);

  const sonuc = await appKodGonder(oturum.kullanici.id, "sifre", hedef.telefon);
  if (!sonuc.ok) return apiHata(sonuc.error, 429);

  return NextResponse.json({
    maskeli: maskPhone(hedef.telefon),
    // İstemci bu numarayı ikinci adımda geri gönderiyor; kayıtlı numara
    // varsa orada da yok sayılacak.
    yeniNumaraMi: hedef.durum === "yeni",
  });
}

/** Adım 2 — kodu doğrula, şifreyi değiştir (ve gerekiyorsa numarayı kaydet). */
export async function PUT(request: Request) {
  const oturum = await appKullaniciGerekli(request);
  if ("yanit" in oturum) return oturum.yanit;

  const govde = await govdeOku(request);
  if (!govde) return apiHata("İstek gövdesi okunamadı.", 400);

  const kod = alanDogrula(metin(govde, "kod"), "dogrulamaKodu", "Kod");
  if (!kod.ok) return apiHata(kod.hata, 400);

  const yeniSifre = metin(govde, "yeniSifre");
  const sifreHatasi = sifreSorunu(yeniSifre);
  if (sifreHatasi) return apiHata(sifreHatasi, 400);

  const sinir = await hizSiniriUygula(SINIRLAR.otpDeneme, oturum.kullanici.id);
  if (!sinir.izin) return apiHata(hizSiniriMesaji(sinir), 429);

  const dogrulama = await appKodDogrula(oturum.kullanici.id, "sifre", kod.deger);
  if (!dogrulama.ok) return apiHata(dogrulama.error, 400);

  const mevcutKayit = await prisma.appUser.findUnique({
    where: { id: oturum.kullanici.id },
    select: { telefon: true, telefonDogrulandi: true },
  });
  if (!mevcutKayit) return apiHata("Hesap bulunamadı.", 404);

  /**
   * İlk kez numara eklenmişse DOĞRULANMIŞ olarak kaydediliyor: kod tam o
   * numaraya gitti ve kullanıcı onu okudu — doğrulamanın tanımı bu.
   *
   * Aynı kural birinci adımdakiyle: kayıtlı numara varsa istekteki numara
   * burada da yok sayılıyor, yani ikinci adımda numara değiştirilemiyor.
   */
  const hedef = degistirmeHedefi(mevcutKayit, metin(govde, "telefon"));

  try {
    await prisma.appUser.update({
      where: { id: oturum.kullanici.id },
      data: {
        passwordHash: await hashPassword(yeniSifre),
        // Bu andan önceki jetonlar düşüyor — çalınmış oturum da kapansın.
        passwordChangedAt: new Date(),
        ...(hedef.durum === "yeni"
          ? { telefon: hedef.telefon, telefonDogrulandi: new Date() }
          : {}),
      },
    });
  } catch {
    return apiHata("Bu numara başka bir hesapta kayıtlı.", 409);
  }

  return NextResponse.json({
    degistirildi: true,
    // Şifre değişince mevcut jeton da geçersizleşiyor; istemci yeniden
    // giriş yapmalı. Bunu söylemek, sessizce 401'e düşmekten iyi.
    yenidenGirisGerekli: true,
  });
}
