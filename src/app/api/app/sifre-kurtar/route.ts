import { NextResponse, after } from "next/server";
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

/**
 * Yanıtın en erken dönebileceği an (ms).
 *
 * Gövdeyi aynı yapmak YETMİYOR. Tarayıcıda ölçüldü: kurtarılabilir bir
 * hesapta yanıt 2724 ms, olmayan hesapta 924 ms geliyordu. Gövdeden
 * okunamayan cevap KRONOMETREDEN okunuyordu — üç deneme, kullanıcı adının
 * kayıtlı olup olmadığını kesin söylüyor.
 *
 * Farkın tamamı SMS sağlayıcısına gidiş dönüşüydü. İki adımda kapatıldı:
 *
 *   1. SMS gönderimi `after()` ile yanıttan SONRAYA alındı; artık istek
 *      yolunda değil (bkz. aşağıdaki çağrı). Geriye kalan iş her iki dalda
 *      da aynı: tek bir indeksli sorgu.
 *   2. O sorgunun "bulundu / bulunamadı" farkı da mikrosaniyeler
 *      mertebesinde olsa görünmesin diye iki dal ortak bir tabana
 *      yaslanıyor.
 *
 * Taban DEĞİŞKEN İŞ İÇERMEMELİ; içerseydi yine sızardı. Burada içermiyor.
 */
const EN_AZ_SURE_MS = 700;

async function tabanaKadarBekle(baslangic: number) {
  const kalan = EN_AZ_SURE_MS - (Date.now() - baslangic);
  if (kalan > 0) await new Promise((coz) => setTimeout(coz, kalan));
}

/** Adım 1 — kullanıcı adını al, kayıtlı numaraya kod gönder. */
export async function POST(request: Request) {
  const baslangic = Date.now();
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
    /**
     * SMS YANIT GÖNDERİLDİKTEN SONRA çıkıyor. `await` edilseydi
     * sağlayıcıya gidiş dönüş süresi doğrudan yanıt süresine eklenir ve
     * yukarıda anlatılan sızıntı geri gelirdi.
     *
     * `after` işin tamamlanmasını garanti ediyor (yanıt hata ile bitse
     * bile çalışıyor), yani "ateşle ve unut" değil. Gönderim başarısız
     * olursa kullanıcı kodu alamıyor ve yeniden istiyor — zaten
     * `await` edilen hâlde de yapabileceğimiz tek şey buydu: sonucu
     * istemciye söylemek sızıntının ta kendisi olurdu.
     */
    const { appUserId, telefon } = hedef;
    after(async () => {
      await appKodGonder(appUserId, "sifre", telefon);
    });
  }

  await tabanaKadarBekle(baslangic);

  /**
   * Sonuç ne olursa olsun BAYT BAYT aynı yanıt.
   *
   * Burada bir süre maskeli numara da dönüyordu ("kod +90 5•• ••• 99 11
   * numarasına gitti") — kayıtlı kullanıcıda dolu, olmayanda null. Niyet
   * iyiydi, sonuç bir VARLIK SORGUSUYDU: yanıttaki tek alan, girilen
   * kullanıcı adının kayıtlı ve kurtarılabilir olup olmadığını söylüyordu.
   * Tarayıcıda ölçüldü ve kaldırıldı.
   *
   * Bedeli, kullanıcının kodun hangi numaraya gittiğini görememesi. Bu
   * kabul edilebilir: numarayı zaten kendisi eklemiş ve hesapta tek bir
   * numara var — söylenecek yeni bir bilgi yok. Oturum İÇİNDEKİ şifre
   * değiştirme akışı maskeli numarayı gösteriyor, çünkü orada isteği
   * atanın kim olduğu zaten biliniyor.
   */
  return NextResponse.json({
    gonderildi: true,
    bilgi: "Kullanıcı adına kayıtlı doğrulanmış bir numara varsa kod gönderildi.",
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
