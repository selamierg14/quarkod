import { NextResponse } from "next/server";
import { prisma } from "@/lib/cekirdek/db";
import { apiHata, appKullaniciGerekli, govdeOku, metin } from "@/lib/kimlik/app-api";
import { normalizePhone } from "@/lib/kimlik/username";
import { alanDogrula } from "@/lib/cekirdek/desenler";
import { SINIRLAR, hizSiniriMesaji, hizSiniriUygula } from "@/lib/kimlik/hiz-siniri";
import { appKodDogrula, appKodGonder } from "@/lib/biyerlere/app-otp";
import { maskPhone } from "@/lib/kimlik/otp";

export const dynamic = "force-dynamic";

/**
 * Kurtarma numarasının eklenmesi ve DOĞRULANMASI.
 *
 * İki adım tek uçta: `POST` numarayı alıp kod gönderiyor, `PUT` kodu
 * doğrulayıp numarayı kaydediyor.
 *
 * NUMARA DOĞRULANMADAN KAYDEDİLMİYOR ve bu işin özü. Doğrulanmamış bir
 * numara kurtarma için işe yaramaz — yazım hatası varsa kullanıcı yine
 * kilitli kalır, üstelik "kurtarma kanalım var" diye yanlış güven verir.
 * Daha kötüsü: yanlışlıkla BAŞKASININ numarası girilmişse, o kişi
 * kurtarma kodunu alıp hesabı devralabilir.
 *
 * Bu yüzden `telefon` ve `telefonDogrulandi` AYNI ANDA yazılıyor; ikisi
 * arasında hiç boşluk yok.
 */

/**
 * Hesapta doğrulanmış bir numara var mı?
 *
 * Arayüz bunu şifre değiştirme ekranını çizmeden önce soruyor: numara
 * yoksa aynı ekranda numara alanı da gösteriliyor. Bu sorulmasaydı,
 * kullanıcı mevcut şifresini yazıp gönderdikten SONRA "numaran yok"
 * hatasını alır ve baştan başlardı.
 *
 * Yanıt MASKELİ — tam numara geri verilmiyor. Jetonu ele geçiren birine
 * kullanıcının telefon numarasını hediye etmenin bir gereği yok; ekranda
 * yapılacak iş ("kod şu numaraya gidecek") maskeliyle de yapılıyor.
 */
export async function GET(request: Request) {
  const oturum = await appKullaniciGerekli(request);
  if ("yanit" in oturum) return oturum.yanit;

  const kullanici = await prisma.appUser.findUnique({
    where: { id: oturum.kullanici.id },
    select: { telefon: true, telefonDogrulandi: true },
  });

  const numara =
    kullanici?.telefon && kullanici.telefonDogrulandi
      ? normalizePhone(kullanici.telefon)
      : null;

  return NextResponse.json({ maskeli: numara ? maskPhone(numara) : null });
}

/** Adım 1 — numarayı al, doğrulama kodu gönder. */
export async function POST(request: Request) {
  const oturum = await appKullaniciGerekli(request);
  if ("yanit" in oturum) return oturum.yanit;

  const govde = await govdeOku(request);
  if (!govde) return apiHata("İstek gövdesi okunamadı.", 400);

  const dogrulama = alanDogrula(metin(govde, "telefon"), "telefon", "Telefon");
  if (!dogrulama.ok) return apiHata(dogrulama.hata, 400);

  const numara = normalizePhone(dogrulama.deger);
  if (!numara) {
    return apiHata("Geçerli bir cep telefonu girin (5XX...).", 400);
  }

  /**
   * Numara BAŞKA bir hesapta kayıtlıysa reddediliyor.
   *
   * Hangi hesap olduğu SÖYLENMİYOR: "bu numara falanca kullanıcıda kayıtlı"
   * demek, numaradan kullanıcı adı öğrenmenin yolu olurdu.
   */
  const sahipli = await prisma.appUser.findUnique({
    where: { telefon: numara },
    select: { id: true },
  });
  if (sahipli && sahipli.id !== oturum.kullanici.id) {
    return apiHata("Bu numara başka bir hesapta kayıtlı.", 409);
  }

  const sinir = await hizSiniriUygula(SINIRLAR.otpDeneme, oturum.kullanici.id);
  if (!sinir.izin) return apiHata(hizSiniriMesaji(sinir), 429);

  const sonuc = await appKodGonder(oturum.kullanici.id, "telefon", numara);
  if (!sonuc.ok) return apiHata(sonuc.error, 429);

  return NextResponse.json({ maskeli: maskPhone(numara) });
}

/** Adım 2 — kodu doğrula, numarayı kaydet. */
export async function PUT(request: Request) {
  const oturum = await appKullaniciGerekli(request);
  if ("yanit" in oturum) return oturum.yanit;

  const govde = await govdeOku(request);
  if (!govde) return apiHata("İstek gövdesi okunamadı.", 400);

  const kod = alanDogrula(metin(govde, "kod"), "dogrulamaKodu", "Kod");
  if (!kod.ok) return apiHata(kod.hata, 400);

  const numara = normalizePhone(metin(govde, "telefon"));
  if (!numara) return apiHata("Geçerli bir cep telefonu girin.", 400);

  const sinir = await hizSiniriUygula(SINIRLAR.otpDeneme, oturum.kullanici.id);
  if (!sinir.izin) return apiHata(hizSiniriMesaji(sinir), 429);

  const dogrulama = await appKodDogrula(oturum.kullanici.id, "telefon", kod.deger);
  if (!dogrulama.ok) return apiHata(dogrulama.error, 400);

  try {
    await prisma.appUser.update({
      where: { id: oturum.kullanici.id },
      // İkisi birlikte: doğrulanmamış numara hiç yazılmıyor.
      data: { telefon: numara, telefonDogrulandi: new Date() },
    });
  } catch {
    // Kod doğrulanırken başka bir hesap aynı numarayı almış olabilir;
    // tekillik kısıtı son sözü söylüyor.
    return apiHata("Bu numara başka bir hesapta kayıtlı.", 409);
  }

  return NextResponse.json({ telefon: maskPhone(numara), dogrulandi: true });
}

/** Numarayı kaldırır — kurtarma kanalı da kapanıyor. */
export async function DELETE(request: Request) {
  const oturum = await appKullaniciGerekli(request);
  if ("yanit" in oturum) return oturum.yanit;

  await prisma.appUser.update({
    where: { id: oturum.kullanici.id },
    data: { telefon: null, telefonDogrulandi: null },
  });
  return NextResponse.json({ silindi: true });
}
