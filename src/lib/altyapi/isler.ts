/**
 * Zamanlanmış işlerin tanımı ve "geç kaldı mı" kuralı.
 *
 * Bu işler sunucuda cron'a bağlanmazsa sessizce hiç çalışmıyor: KVKK
 * temizliği yapılmıyor (verdiğimiz saklama sözü tutulmuyor), yedek
 * alınmıyor. Sessiz arıza en pahalısı olduğu için her çalışma kayda
 * geçiyor ve panelde "en son ne zaman çalıştı" görünüyor.
 */

export type IsTanimi = {
  ad: string;
  etiket: string;
  aciklama: string;
  /** Bu kadar saat geçtiyse iş gecikmiş sayılır. */
  beklenenSaat: number;
  komut: string;
};

export const ZAMANLI_ISLER: IsTanimi[] = [
  {
    ad: "kvkk-temizle",
    etiket: "KVKK temizliği",
    aciklama:
      "Saklama süresi dolan iletişim bilgilerini siler. Çalışmazsa müşteriye verilen saklama sözü tutulmamış olur.",
    // Günlük iş; bir günlük gecikmeye tolerans tanıyıp 36 saatte uyarıyoruz.
    beklenenSaat: 36,
    komut: "npm run kvkk:temizle",
  },
  {
    ad: "yedekle",
    etiket: "Yedekleme",
    aciklama:
      "Veritabanının tutarlı bir kopyasını alır. Çalışmazsa disk arızasında geri dönüş yok.",
    beklenenSaat: 36,
    komut: "npm run yedekle",
  },
  {
    ad: "haftalik-rapor",
    etiket: "Haftalık rapor",
    aciklama: "İşletme sahiplerine haftalık özet e-postasını gönderir.",
    beklenenSaat: 8 * 24,
    komut: "npm run rapor:haftalik",
  },
];

export type IsDurumu = "calisti" | "gecikti" | "hic" | "hatali" | "yonetiliyor";

export type IsSaglik = IsTanimi & {
  durum: IsDurumu;
  sonCalisma: Date | null;
  sonHata: string | null;
  detay: string | null;
};

/** Son çalışma kaydına bakarak işin durumunu belirler. */
export function isDurumu(
  tanim: IsTanimi,
  son: { finishedAt: Date | null; ok: boolean; detail: string | null } | null,
  simdi = new Date(),
): IsDurumu {
  if (!son) return "hic";
  // Son deneme hata verdiyse, tarihi taze olsa bile sorun var demektir.
  if (!son.ok) return "hatali";
  if (!son.finishedAt) return "hatali";
  const gecen = (simdi.getTime() - son.finishedAt.getTime()) / 3_600_000;
  return gecen > tanim.beklenenSaat ? "gecikti" : "calisti";
}

export const DURUM_METNI: Record<IsDurumu, string> = {
  calisti: "Çalışıyor",
  gecikti: "Gecikti",
  hic: "Hiç çalışmadı",
  hatali: "Son çalışma hatalı",
  yonetiliyor: "Neon tarafından yönetiliyor",
};

/** Dikkat isteyen durumlar — "yönetiliyor" ve "çalıştı" sorun değil. */
export function isSorunluMu(durum: IsDurumu): boolean {
  return durum === "gecikti" || durum === "hic" || durum === "hatali";
}

/**
 * Veritabanının yedeği bizim işimiz mi, sağlayıcının mı?
 *
 * Neon (yönetilen Postgres) her veritabanının otomatik anlık yedeğini ve
 * zamana dönük geri yüklemeyi kendisi yapıyor. Orada `npm run yedekle`
 * hiç zamanlanmıyor ve zamanlanması da gerekmiyor — ama Sistem sağlığı
 * ekranı yine de "Yedekleme: Hiç çalışmadı" diye KIRMIZI hata
 * gösteriyordu, hemen altındaki not ise "ayrı bir cron gerekmiyor"
 * diyordu. UI incelemesi bu çelişkiyi yakaladı.
 *
 * Bağlantı adresinin kendisi dışarı verilmiyor; yalnızca sunucu adının
 * Neon'a ait olup olmadığına bakılıyor. Adres çözülemezse "bizim işimiz"
 * kabul ediliyor — emin olmadan bir yedeği "yönetiliyor" saymak, hiç
 * yedek alınmayan bir kurulumu sağlıklı gösterirdi.
 */
export function yedeklemeYonetiliyorMu(veritabaniAdresi: string | undefined): boolean {
  if (!veritabaniAdresi) return false;
  try {
    return new URL(veritabaniAdresi).hostname.toLowerCase().endsWith(".neon.tech");
  } catch {
    return false;
  }
}

/**
 * İşin ekranda gösterilecek durumu. `isDurumu`nun üstüne tek kural
 * ekliyor: sağlayıcının yönettiği yedekleme "hiç çalışmadı" değil.
 */
export function isSagligi(
  tanim: IsTanimi,
  son: { finishedAt: Date | null; ok: boolean; detail: string | null } | null,
  secenek: { yedeklemeYonetiliyor: boolean },
  simdi = new Date(),
): IsDurumu {
  // Biri yine de elle `npm run yedekle` çalıştırdıysa o sonucu göstermek
  // daha dürüst: hata verdiyse bilinmeli.
  if (tanim.ad === "yedekle" && secenek.yedeklemeYonetiliyor && !son) return "yonetiliyor";
  return isDurumu(tanim, son, simdi);
}
