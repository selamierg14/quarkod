import "server-only";
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../cekirdek/db";
import { sendSms } from "../altyapi/sms";
import { deliveryPhone } from "./iki-asamali";
import { normalizePhone } from "./username";

// Saf karar mantığı `iki-asamali.ts`'te (server-only taşımıyor, betikler ve
// testler oradan okuyor); çağıranların içe aktarımı değişmesin diye burada
// yeniden dışa aktarılıyor.
export {
  twoFactorEnabled,
  deliveryPhone,
  otpTelefonu,
  ikiAsamaliDurum,
  type OtpTelefonDurumu,
  type IkiAsamaliDurum,
} from "./iki-asamali";

/**
 * Tek kullanımlık SMS kodları.
 *
 * Kod veritabanında düz metin durmaz; şifre gibi hash'lenir. Veritabanını
 * gören biri aktif kodları okuyup başkasının hesabına giremesin diye.
 */

/** Kodun hangi akış için üretildiği — aynı anda ikisi ayrı yaşayabilir. */
/**
 * OTP kayıtlarının tutulduğu tablo — dışarıdan veriliyor.
 *
 * İki ayrı kullanıcı dünyası var (panel `User`, tüketici `AppUser`) ve
 * ikisinin OTP tabloları ayrı (`otp_codes`, `app_otp_codes`). Mantığı
 * ikinci kez yazmak yerine depo enjekte ediliyor — `hiz-siniri.ts` de
 * aynı deseni kullanıyor.
 *
 * Bunun güvenlik tarafı da var: deneme sayacının atomik artırılması
 * (bkz. aşağıdaki uzun yorum) TEK yerde duruyor. İki kopya olsaydı biri
 * düzeltilip diğeri unutulduğunda, unutulanda altı haneli kod sınırsız
 * denenebilir kalırdı.
 */
export type OtpDeposu = {
  findFirst: (args: unknown) => Promise<OtpKaydi | null>;
  create: (args: unknown) => Promise<{ id: string }>;
  update: (args: unknown) => Promise<{ attempts: number; usedAt: Date | null }>;
  updateMany: (args: unknown) => Promise<unknown>;
  delete: (args: unknown) => Promise<unknown>;
};

type OtpKaydi = {
  id: string;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
};

/** Kaydın kime ait olduğunu söyleyen alan — tabloya göre değişiyor. */
export type OtpSahibi = { userId: string } | { appUserId: string };

export type OtpPurpose = "giris" | "sifre";

const CODE_LENGTH = 6;

/**
 * Kodun geçerlilik süresi.
 *
 * SMS gövdesindeki "X dakika geçerlidir" cümlesi de buradan besleniyor —
 * süre değişip metin sabit kalırsa kullanıcıya yalan söylemiş oluruz.
 */
export const OTP_TTL_MINUTES = 3;
const MAX_ATTEMPTS = 5;
/** Aynı kullanıcıya bu süre içinde yeni kod üretilmez (SMS bombardımanı olmasın). */
const RESEND_COOLDOWN_SECONDS = 60;

function generateCode(): string {
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
}

/** Numaranın son 4 hanesi dışında hepsini gizler: "+90 5•• ••• •• 33". */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const last4 = digits.slice(-4);
  return `+90 5•• ••• ${last4.slice(0, 2)} ${last4.slice(2)}`;
}

export type IssueResult =
  | { ok: true; maskedPhone: string }
  | { ok: false; error: string };

/**
 * Kullanıcıya kod üretip SMS ile gönderir.
 *
 * Kod gönderilemezse kayıt da silinir — kullanıcıyı eline geçmeyecek bir kodu
 * beklerken bırakmak, hata mesajı vermekten daha kötü.
 */
export async function issueOtpFor(
  depo: OtpDeposu,
  sahip: OtpSahibi,
  phone: string,
  purpose: string,
  metinUret: (kod: string, purpose: string) => string = varsayilanMetin,
): Promise<IssueResult> {
  const hedef = normalizePhone(phone);
  if (!hedef) return { ok: false, error: "Telefon numarası geçersiz." };

  // Bekleme süresi AYNI NUMARAYA yapılan art arda isteklere uygulanıyor.
  //
  // Başka bir numaraya kod istemek meşru bir eylem: kullanıcı birincil
  // numarasına ulaşamadığı için yedeğine geçiyor ve tam da o an bir dakika
  // beklemesi isteniyordu — yani yedek numara özelliği, ihtiyaç duyulduğu
  // anda çalışmıyordu. Aynı numaraya art arda istek ise hâlâ SMS
  // bombardımanı ve engelleniyor.
  //
  // `phone: null` olan eski kayıtlar "bilinmiyor" sayılıp bekletiyor —
  // temkinli taraf.
  const since = new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000);
  const recent = await depo.findFirst({
    where: {
      ...sahip,
      purpose,
      createdAt: { gte: since },
      usedAt: null,
      OR: [{ phone: hedef }, { phone: null }],
    },
    orderBy: { createdAt: "desc" },
  });
  if (recent) {
    return {
      ok: false,
      error: `Bu numaraya az önce bir kod gönderildi. Yeni kod istemek için ${RESEND_COOLDOWN_SECONDS} saniye bekleyin.`,
    };
  }

  // Bekleyen eski kodlar geçersizleşsin: aynı anda iki geçerli kod olmasın.
  await depo.updateMany({
    where: { ...sahip, purpose, usedAt: null },
    data: { usedAt: new Date() },
  });

  const code = generateCode();
  const record = await depo.create({
    data: {
      ...sahip,
      purpose,
      codeHash: await bcrypt.hash(code, 10),
      phone: hedef,
      expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
    },
  });

  const metin = metinUret(code, purpose);

  // Test aşamasında yönlendirme yapılır; maskeleme yine kullanıcının kendi
  // numarasını gösterir ki ekranda tutarsızlık olmasın.
  const sonuc = await sendSms(deliveryPhone(hedef), metin);
  if (!sonuc.sent) {
    await depo.delete({ where: { id: record.id } });
    return { ok: false, error: sonuc.error ?? "Kod gönderilemedi." };
  }

  return { ok: true, maskedPhone: maskPhone(hedef) };
}

export type VerifyResult = { ok: true } | { ok: false; error: string };

/** Kodu doğrular ve tek kullanımlık olarak yakar. */
export async function verifyOtpFor(
  depo: OtpDeposu,
  sahip: OtpSahibi,
  purpose: string,
  code: string,
): Promise<VerifyResult> {
  const record = await depo.findFirst({
    where: { ...sahip, purpose, usedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return { ok: false, error: "Geçerli bir kod bulunamadı. Yeniden kod isteyin." };
  }
  if (record.expiresAt < new Date()) {
    return { ok: false, error: "Kodun süresi doldu. Yeniden kod isteyin." };
  }
  /**
   * SAYAÇ ÖNCE ARTIRILIYOR, SONRA KONTROL EDİLİYOR — ve bu sıra kritik.
   *
   * Önceki hâl "oku → karşılaştır → artır" idi ve deneme sınırını
   * tamamen işlevsiz bırakıyordu: eşzamanlı istekler aynı `attempts`
   * değerini okuyup hepsi kontrolü geçiyordu. Araya giren
   * `bcrypt.compare` (~100 ms) pencereyi iyice açıyordu.
   *
   * ÖLÇÜLDÜ: 40 eşzamanlı yanlış tahminin 40'ı da denendi, kilit HİÇ
   * devreye girmedi. Altı haneli kodu güvenli kılan tek şey beş deneme
   * sınırıydı ve o sınır yoktu. Şifre sıfırlama akışı kod adımına
   * yalnızca KULLANICI ADIYLA ulaştığı için bu, hesap devralmaya açık bir
   * yoldu.
   *
   * `increment` tek bir atomik UPDATE: her eşzamanlı istek FARKLI bir
   * değer alıyor ve yalnızca ilk MAX_ATTEMPTS tanesi karşılaştırmaya
   * geçebiliyor. Başarılı denemenin de sayacı artırması zararsız — kod
   * zaten o an yakılıyor.
   */
  const guncel = await depo.update({
    where: { id: record.id },
    data: { attempts: { increment: 1 } },
    select: { attempts: true, usedAt: true },
  });

  // Artırma ile okuma arasında başka bir istek kodu yakmış olabilir.
  if (guncel.usedAt) {
    return { ok: false, error: "Geçerli bir kod bulunamadı. Yeniden kod isteyin." };
  }

  if (guncel.attempts > MAX_ATTEMPTS) {
    await depo.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    return { ok: false, error: "Çok fazla hatalı deneme. Yeniden kod isteyin." };
  }

  const dogru = await bcrypt.compare(code.trim(), record.codeHash);
  if (!dogru) {
    const kalan = MAX_ATTEMPTS - guncel.attempts;
    return {
      ok: false,
      error:
        kalan > 0
          ? `Kod hatalı. ${kalan} deneme hakkınız kaldı.`
          : "Kod hatalı. Yeniden kod isteyin.",
    };
  }

  await depo.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });
  return { ok: true };
}

/** Panel akışlarının SMS metni. */
function varsayilanMetin(code: string, purpose: string): string {
  return purpose === "giris"
    ? `Memnuniyet paneli giris kodunuz: ${code}. ${OTP_TTL_MINUTES} dakika gecerlidir.`
    : `Sifre sifirlama kodunuz: ${code}. ${OTP_TTL_MINUTES} dakika gecerlidir.`;
}

/* ---------------------------------------------------------------- panel */
/**
 * Panel (`User`) için sarmalayıcılar — çağıranlar deponun varlığını
 * bilmek zorunda kalmasın. Tüketici tarafı kendi sarmalayıcılarını
 * lib/biyerlere/app-otp.ts'te kuruyor.
 */
export function issueOtp(userId: string, phone: string, purpose: OtpPurpose) {
  return issueOtpFor(prisma.otpCode as unknown as OtpDeposu, { userId }, phone, purpose);
}

export function verifyOtp(userId: string, purpose: OtpPurpose, code: string) {
  return verifyOtpFor(prisma.otpCode as unknown as OtpDeposu, { userId }, purpose, code);
}
