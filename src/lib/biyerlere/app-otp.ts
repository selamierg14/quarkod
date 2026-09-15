import "server-only";
import { prisma } from "../cekirdek/db";
import {
  issueOtpFor,
  verifyOtpFor,
  maskPhone,
  OTP_TTL_MINUTES,
  type OtpDeposu,
} from "../kimlik/otp";
import { normalizePhone } from "../kimlik/username";

// Saf kural ayrı dosyada (testte server-only içe aktarılamıyor); buradan
// yeniden dışa veriliyor ki çağıranlar tek yere baksın.
export { degistirmeHedefi } from "./kurtarma-numarasi";
export type { DegistirmeHedefi, NumaraDurumu } from "./kurtarma-numarasi";

/**
 * Tüketici (Biyerlere) tarafının SMS kodları.
 *
 * Mantık paylaşılıyor: kod üretimi, süre, bekleme ve deneme sayacının
 * ATOMİK artırılması lib/kimlik/otp.ts'te tek yerde duruyor; burası
 * yalnızca "hangi tablo" ve "SMS metni ne olsun" sorularını cevaplıyor.
 *
 * Ayrımın güvenlik tarafı önemli: deneme sayacı bir kez yanlış yazıldığında
 * altı haneli kod sınırsız denenebilir hâle geliyor (panelde bu hata
 * gerçekten oldu ve düzeltildi). İki kopya olsaydı, biri düzeltilip
 * diğerinin unutulması an meselesiydi.
 */

const depo = prisma.appOtpCode as unknown as OtpDeposu;

export type AppOtpAmaci = "sifre" | "telefon";

function smsMetni(kod: string, amac: string): string {
  return amac === "telefon"
    ? `Biyerlere numara dogrulama kodunuz: ${kod}. ${OTP_TTL_MINUTES} dakika gecerlidir.`
    : `Biyerlere sifre sifirlama kodunuz: ${kod}. ${OTP_TTL_MINUTES} dakika gecerlidir.`;
}

/**
 * Koda gidecek numarayı seçer ve kodu gönderir.
 *
 * `hedefNumara` yalnızca NUMARA DOĞRULAMA akışında veriliyor: orada
 * kullanıcının henüz kayıtlı bir numarası yok, doğrulamak istediği numara
 * isteğin içinde geliyor. Şifre kurtarmada ise numara DAİMA veritabanından
 * okunuyor — istemcinin verdiği numaraya kod göndermek, herhangi bir
 * hesabın kurtarma kodunu saldırganın telefonuna yollamak olurdu.
 */
export async function appKodGonder(
  appUserId: string,
  amac: AppOtpAmaci,
  hedefNumara: string,
) {
  return issueOtpFor(depo, { appUserId }, hedefNumara, amac, smsMetni);
}

export async function appKodDogrula(
  appUserId: string,
  amac: AppOtpAmaci,
  kod: string,
) {
  return verifyOtpFor(depo, { appUserId }, amac, kod);
}

export type KurtarmaHedefi =
  | { durum: "hazir"; appUserId: string; telefon: string; maskeli: string }
  /**
   * Kullanıcı yok, numarası yok ya da numarası doğrulanmamış — ÜÇÜ DE
   * aynı sonucu veriyor ve bu bilinçli: hangisi olduğunu söylemek,
   * "bu kullanıcı adı kayıtlı mı" sorusunu cevaplayan bir uca dönüşürdü.
   */
  | { durum: "yok" };

/**
 * Kurtarma kodunun gideceği yeri belirler.
 *
 * Numaranın DOĞRULANMIŞ olması şart: yazım hatasıyla girilmiş bir numara
 * kurtarma için işe yaramaz, üstelik başkasının numarası olabilir.
 * `telefonDogrulandi` boşken kurtarma yapılamıyor.
 */
export async function kurtarmaHedefi(username: string): Promise<KurtarmaHedefi> {
  const kullanici = await prisma.appUser.findUnique({
    where: { username: username.trim().toLowerCase() },
    select: { id: true, active: true, telefon: true, telefonDogrulandi: true },
  });

  if (!kullanici?.active || !kullanici.telefon || !kullanici.telefonDogrulandi) {
    return { durum: "yok" };
  }
  const normal = normalizePhone(kullanici.telefon);
  if (!normal) return { durum: "yok" };

  return {
    durum: "hazir",
    appUserId: kullanici.id,
    telefon: normal,
    maskeli: maskPhone(normal),
  };
}
