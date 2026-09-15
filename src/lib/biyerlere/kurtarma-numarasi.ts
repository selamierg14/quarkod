import { normalizePhone } from "../kimlik/username";

/**
 * Kurtarma numarası kuralları — SAF, sunucuya bağlı değil.
 *
 * `app-otp.ts`ten ayrı duruyorlar çünkü orası `server-only` ve prisma
 * bağımlı; testte içe aktarılamıyor. Buradaki kural doğrudan hesap
 * devralmaya açılan türden, yani test edilemez bırakılacak son yer.
 */

/** `AppUser`ın kurtarma numarasıyla ilgili iki alanı. */
export type NumaraDurumu = {
  telefon: string | null;
  telefonDogrulandi: Date | null;
};

export type DegistirmeHedefi =
  /** Kayıtlı doğrulanmış numara kullanılıyor; istekteki numara yok sayıldı. */
  | { durum: "kayitli"; telefon: string }
  /** Numara ilk kez ekleniyor; doğrulandığında kaydedilecek. */
  | { durum: "yeni"; telefon: string }
  /** Numara yok ve istekte geçerli bir numara da gelmedi. */
  | { durum: "numaraYok" };

/**
 * Oturum içi şifre değiştirmede kodun GİDECEĞİ numarayı seçer.
 *
 * Kuralın tamamı tek satırda: KAYITLI DOĞRULANMIŞ NUMARA VARSA İSTEKTEKİ
 * NUMARA YOK SAYILIR. Aksi halde çalınmış bir oturum, kodu saldırganın
 * telefonuna yönlendirip iki faktörü tek faktöre indirirdi — "mevcut
 * şifreyi bil" şartı da zaten oturumu ele geçiren için aşılmış demek
 * değil, ama kod o kişinin eline geçerse şart tamamen çöker.
 *
 * Kayıtlı numara yoksa istekteki numara kabul ediliyor: kullanıcı kurtarma
 * numarasını ilk kez burada veriyor (ayrı bir "numara ekle" ekranı bilerek
 * yok — bkz. sifre-degistir/route.ts).
 *
 * Route'tan ayrı duruyor ki test edilebilsin: buradaki bir hata doğrudan
 * hesap devralmaya açılıyor ve hatayı elle fark etmek zor.
 */
export function degistirmeHedefi(
  kullanici: NumaraDurumu,
  istektekiNumara: string,
): DegistirmeHedefi {
  if (kullanici.telefon && kullanici.telefonDogrulandi) {
    const kayitli = normalizePhone(kullanici.telefon);
    if (kayitli) return { durum: "kayitli", telefon: kayitli };
    // Kayıtlı numara okunamıyorsa (eski/bozuk veri) istekteki numaraya
    // DÜŞÜLMÜYOR: doğrulanmış sayılan bir numaranın yerine istemcinin
    // verdiğini koymak tam da engellenmek istenen şey.
    return { durum: "numaraYok" };
  }

  const yeni = normalizePhone(istektekiNumara);
  return yeni ? { durum: "yeni", telefon: yeni } : { durum: "numaraYok" };
}

