/**
 * Arkadaş daveti — viral kayıt döngüsü.
 *
 * Saf tutuldu (kod üretimi hariç her şey saf): kural "kim kimi davet
 * edebilir, ödül ne kadar" veritabanından bağımsız test edilebilsin.
 *
 * Ödül KUPON DEĞİL, PUAN: Coupon.businessId zorunlu alan — "hangi kafede
 * geçerli" bilmeyen, platform geneli bir daveti tek bir işletmeye
 * bağlamak yanlış olurdu. Puan zaten kaşif seviyesini ve rozetleri
 * besliyor; davet burada aynı havuza akıyor.
 */

/** Karışabilecek karakterler (0/O, 1/I/l) bilerek çıkarıldı — telefonda
 * sesli okuyup yazdırmak kolay olsun diye. */
const ALFABE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const KOD_UZUNLUGU = 6;

export function davetKoduUret(): string {
  let kod = "";
  for (let i = 0; i < KOD_UZUNLUGU; i++) {
    kod += ALFABE[Math.floor(Math.random() * ALFABE.length)];
  }
  return kod;
}

/** Hem daveti gönderenin hem kabul edenin kazandığı puan. */
export const DAVET_ODULU_PUAN = 100;

/**
 * Bir kullanıcının davetten kazanabileceği en fazla ödül sayısı.
 *
 * GÜVENLİK/SUİSTİMAL SINIRI. Kayıt ucu herkese açık ve hız sınırı yok;
 * kendi davet koduyla peş peşe hesap açan biri sınırsız puan
 * toplayabiliyordu. Puan seviyeyi, rozetleri ve sıralamayı besliyor —
 * yani oyunlaştırmanın tamamını anlamsızlaştıran bir açıktı.
 *
 * Sınır kaydı ENGELLEMİYOR, yalnızca ödülü kesiyor: gerçekten yirmi
 * arkadaşını getiren kullanıcıyı cezalandırmak yerine, yirmi biriden
 * sonrasını ödülsüz bırakmak yeterli. Gerçek bir kullanıcının bu sınıra
 * dayanması pratikte olağanüstü.
 */
export const EN_COK_DAVET_ODULU = 20;

/**
 * Bu davet için ödül verilmeli mi?
 *
 * Saf: "kaç kişiyi davet etmiş" bilgisini çağıran taraf sağlıyor.
 */
export function davetOduluVerilirMi(mevcutDavetSayisi: number): boolean {
  return mevcutDavetSayisi < EN_COK_DAVET_ODULU;
}

/**
 * Girilen davet kodu biçimsel olarak geçerli mi (uzunluk + alfabe).
 *
 * Veritabanında var mı sorusuna bakmaz — o, kayıt ucunun işi. Burası
 * yalnızca "bu bir davet kodu gibi görünüyor mu" sorusuna cevap verir; iki
 * karakterlik ya da rastgele sembollü bir girdiyi DB'ye hiç sormadan eler.
 */
export function davetKoduBicimiGecerliMi(kod: string): boolean {
  const temiz = kod.trim().toUpperCase();
  if (temiz.length !== KOD_UZUNLUGU) return false;
  return [...temiz].every((h) => ALFABE.includes(h));
}
