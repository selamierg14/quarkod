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

export type IsDurumu = "calisti" | "gecikti" | "hic" | "hatali";

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
};
