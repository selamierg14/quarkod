/**
 * Hesabın müşteriye açık ve tam yetkili olup olmadığı.
 *
 * İki sebepten biri bunu bozar:
 *   - `active = false`  → elle askıya alındı,
 *   - `expiresAt` geçti → abonelik süresi doldu.
 *
 * QR müşteri sayfaları ve yazma işlemleri bunu kullanır: süre dolunca
 * müşteri menüsü/anketi kapanır ve panelde değişiklik yapılamaz. Panele
 * *giriş* ayrı bir karardır (bkz. sessionRevokedReason): süresi dolmuş
 * hesabın sahibi salt okunur girebilir, yalnızca askıya alınan giremez.
 *
 * Karar tek bir yerde duruyor; her çağrı noktası kendi kontrolünü yazsaydı
 * biri unutulur ve süresi dolmuş bir hesap oradan çalışmaya devam ederdi.
 */

export type AboneDurumu = {
  active: boolean;
  expiresAt: Date | null;
};

/** Süre dolmasına bu kadar gün kalınca panelde uyarı gösterilir. */
export const UYARI_GUNU = 14;

export function hesapAktifMi(hesap: AboneDurumu | null | undefined, simdi = new Date()): boolean {
  if (!hesap || !hesap.active) return false;
  if (hesap.expiresAt && hesap.expiresAt <= simdi) return false;
  return true;
}

/** Süre bitimine kalan tam gün; süresiz ya da dolmuşsa null. */
export function kalanGun(hesap: AboneDurumu, simdi = new Date()): number | null {
  if (!hesap.expiresAt) return null;
  const fark = hesap.expiresAt.getTime() - simdi.getTime();
  if (fark <= 0) return null;
  return Math.ceil(fark / (24 * 60 * 60 * 1000));
}

/**
 * Abonelik takibindeki aciliyet kademesi.
 *
 * Ödeme sayfası hesapları bu kademeye göre gruplayıp sıralıyor: dolmuş olanlar
 * en üstte (gelir kaçıyor), 7 gün içi kritik, 30 gün içi yaklaşıyor. Süresiz
 * ve bir aydan uzak olanlar "sakin" — takip listesinde yer kaplamasınlar.
 */
export type AbonelikKademe = "dolmus" | "kritik" | "yakin" | "sakin" | "suresiz";

/** Kritik eşiği (gün): bu kadar veya daha az kaldıysa acil. */
export const KRITIK_GUN = 7;

export function abonelikKademe(hesap: AboneDurumu, simdi = new Date()): AbonelikKademe {
  if (!hesap.expiresAt) return "suresiz";
  if (hesap.expiresAt <= simdi) return "dolmus";
  const gun = kalanGun(hesap, simdi);
  if (gun === null) return "dolmus";
  if (gun <= KRITIK_GUN) return "kritik";
  if (gun <= UYARI_GUNU) return "yakin";
  return "sakin";
}

export type AbonelikUyarisi = {
  seviye: "bitti" | "yakin";
  mesaj: string;
};

/**
 * Panelde gösterilecek uyarı.
 *
 * İki işi var: süre dolmadan önce "yenileyin" hatırlatması yapmak (QR'ların
 * bir sabah çalışmadığını müşteriden duymak güveni en hızlı bitiren şey),
 * ve süre dolduktan sonra hesabın artık salt okunur olduğunu söylemek —
 * çünkü sahibi hâlâ girip verisini görebiliyor ve dışa aktarabiliyor.
 */
export function abonelikUyarisi(
  hesap: AboneDurumu,
  simdi = new Date(),
): AbonelikUyarisi | null {
  if (!hesap.expiresAt) return null;

  if (hesap.expiresAt <= simdi) {
    return {
      seviye: "bitti",
      mesaj:
        "Aboneliğinizin süresi doldu. Panel şu an salt okunur; kayıtlarınızı " +
        "görebilir ve dışa aktarabilirsiniz, yenileyince kaldığınız yerden devam eder.",
    };
  }

  const gun = kalanGun(hesap, simdi);
  if (gun === null || gun > UYARI_GUNU) return null;

  return {
    seviye: "yakin",
    mesaj:
      gun <= 1
        ? "Aboneliğinizin süresi bugün doluyor. Yenilenmezse QR kodlarınız çalışmayı durdurur."
        : `Aboneliğinizin süresi ${gun} gün sonra doluyor. Yenilenmezse QR kodlarınız çalışmayı durdurur.`,
  };
}

/** Tarih girdisini (yyyy-aa-gg) günün sonuna sabitler; boşsa null. */
export function tarihGirdisi(value: string): Date | null | undefined {
  const v = value.trim();
  if (!v) return null;
  const eslesme = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!eslesme) return undefined;

  const [, yil, ay, gun] = eslesme;
  // Girilen gün dahil olsun: "31 Aralık'a kadar" o günün sonuna kadardır.
  const tarih = new Date(Number(yil), Number(ay) - 1, Number(gun), 23, 59, 59, 999);
  if (Number.isNaN(tarih.getTime())) return undefined;
  if (tarih.getMonth() !== Number(ay) - 1) return undefined; // 31 Şubat gibi
  return tarih;
}
