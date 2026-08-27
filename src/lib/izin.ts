import { gunGirdisi } from "./gun";

/**
 * Personel izinlerinin çizelgeye yansıması.
 *
 * Saf tutuluyor: "bu kişi bu gün izinli mi" sorusu hem çizelge ekranında,
 * hem Excel dışa aktarımında, hem de atama yapılırken (uyarı) soruluyor.
 * Üç yerde ayrı ayrı hesaplanırsa er ya da geç birbirinden sapar.
 */

export const IZIN_TURLERI = {
  yillik: "Yıllık izin",
  rapor: "Rapor",
  ucretsiz: "Ücretsiz izin",
  musait_degil: "Müsait değil",
} as const;

export type IzinTuru = keyof typeof IZIN_TURLERI;

export const IZIN_DURUMLARI = {
  bekliyor: "Bekliyor",
  onaylandi: "Onaylandı",
  reddedildi: "Reddedildi",
} as const;

export type IzinDurumu = keyof typeof IZIN_DURUMLARI;

export function gecerliIzinTuru(value: string): value is IzinTuru {
  return value in IZIN_TURLERI;
}

export type IzinKaydi = {
  userId: string;
  baslangic: Date;
  bitis: Date;
  tur: string;
  status: string;
};

/**
 * "Kim hangi gün izinli" araması için hızlı bir küme.
 *
 * Anahtar `userId|yyyy-aa-gg`. Aralıklar gün gün açılıyor: bir izin en fazla
 * birkaç hafta sürdüğü için bu ucuz, ve çizelge her hücrede tek bir
 * `has()` ile sorabiliyor — aralık karşılaştırmasını 7 gün × 4 vardiya ×
 * onlarca kişi için tekrar tekrar yapmak yerine.
 *
 * Yalnızca ONAYLI izinler sayılır: bekleyen bir talep henüz bir taahhüt
 * değil, çizelgeyi ona göre boş bırakmak yanlış olur.
 */
export function izinKumesiKur(izinler: IzinKaydi[]): Map<string, IzinTuru> {
  const kume = new Map<string, IzinTuru>();
  for (const izin of izinler) {
    if (izin.status !== "onaylandi") continue;
    const tur = gecerliIzinTuru(izin.tur) ? izin.tur : "yillik";
    for (const gun of gunleriAc(izin.baslangic, izin.bitis)) {
      kume.set(`${izin.userId}|${gun}`, tur);
    }
  }
  return kume;
}

/** Kapsayıcı aralığı gün anahtarlarına açar; ters aralıkta boş döner. */
export function gunleriAc(baslangic: Date, bitis: Date): string[] {
  const gunler: string[] = [];
  const imlec = new Date(baslangic);
  imlec.setHours(0, 0, 0, 0);
  const son = new Date(bitis);
  son.setHours(0, 0, 0, 0);
  // Yanlış girilmiş (bitiş < başlangıç) bir kayıt sonsuz döngü kurmasın.
  if (son < imlec) return gunler;
  // Makul bir üst sınır: bir yıllık izin bile 365 günü geçmez; bozuk bir
  // kayıt yüzünden bellek şişmesin.
  for (let i = 0; i <= 366 && imlec <= son; i++) {
    gunler.push(gunGirdisi(imlec));
    imlec.setDate(imlec.getDate() + 1);
  }
  return gunler;
}

export function izinliMi(
  kume: Map<string, IzinTuru>,
  userId: string,
  gun: string,
): IzinTuru | null {
  return kume.get(`${userId}|${gun}`) ?? null;
}

/** İki kapsayıcı gün aralığı kesişiyor mu — çakışan izin talebini yakalamak için. */
export function araliklarKesisiyorMu(
  aBaslangic: Date,
  aBitis: Date,
  bBaslangic: Date,
  bBitis: Date,
): boolean {
  const gun = (d: Date) => {
    const k = new Date(d);
    k.setHours(0, 0, 0, 0);
    return k.getTime();
  };
  return gun(aBaslangic) <= gun(bBitis) && gun(bBaslangic) <= gun(aBitis);
}
