/**
 * Hesabın kullanılabilir olup olmadığı.
 *
 * İki ayrı sebep var ve ikisi de aynı sonucu doğuruyor:
 *   - `active = false`  → elle askıya alındı,
 *   - `expiresAt` geçti → abonelik süresi doldu.
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

export type AbonelikUyarisi = {
  seviye: "bitti" | "yakin";
  mesaj: string;
};

/**
 * Panelde gösterilecek uyarı.
 *
 * Süre dolduğunda kullanıcı zaten giremiyor; bu uyarı **dolmadan önce**
 * görünsün diye var. Kafenin QR'larının bir sabah çalışmadığını müşteriden
 * duyması, satılan hizmete duyulan güveni en hızlı bitiren şey olurdu.
 */
export function abonelikUyarisi(
  hesap: AboneDurumu,
  simdi = new Date(),
): AbonelikUyarisi | null {
  if (!hesap.expiresAt) return null;

  if (hesap.expiresAt <= simdi) {
    return { seviye: "bitti", mesaj: "Aboneliğinizin süresi doldu." };
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
