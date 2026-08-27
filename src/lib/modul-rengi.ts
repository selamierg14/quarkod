/**
 * Panel modüllerinin renk sistemi — tek kaynak.
 *
 * Panelde her ekran kendi rengini taşır: yönetici gün içinde on farklı
 * sayfa arasında geziniyor ve hepsi aynı beyaz-gri başlıkla açılınca
 * "neredeyim" duygusu kayboluyordu. Renk burada dekorasyon değil, konum
 * işareti.
 *
 * Renk geçişi (gradient) bilinçli: düz bir renk lekesi "doküman", iki
 * durak arasında akan bir yüzey "uygulama" hissi veriyor — pazarlama
 * sitesindeki kart/rozet diliyle de bu sayede aynı aileye giriyor.
 *
 * Tailwind sınıfları derleme anında kaynak taranarak toplanır: sınıf
 * adları burada parça parça değil, tam ve sabit yazılmak zorunda. Bu
 * yüzden `from-${renk}-500` gibi bir kurgu yerine açık eşleme tutuluyor.
 */

export type ModulRengi =
  | "indigo"
  | "sky"
  | "emerald"
  | "amber"
  | "rose"
  | "violet"
  | "teal"
  | "slate";

export type ModulTonu = {
  /** İkon rozeti: dolu, koyu, beyaz ikonlu — sayfanın kimlik mührü. */
  rozet: string;
  /** Bölüm başlığı şeridi: rozetle aynı aileden, çok daha soluk. */
  serit: string;
  /** Kart üstündeki 3px'lik renk çizgisi. */
  cizgi: string;
  /** Sayfa başlığının arkasındaki çok soluk parlama. */
  parilti: string;
  /** Metin vurgusu (rakam, aktif sekme). */
  metin: string;
};

export const MODUL_TONLARI: Record<ModulRengi, ModulTonu> = {
  indigo: {
    rozet: "bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-indigo-500/25",
    serit: "border-indigo-100 bg-gradient-to-r from-indigo-50 to-indigo-50/20",
    cizgi: "bg-gradient-to-r from-indigo-500 to-indigo-400",
    parilti: "from-indigo-500/10",
    metin: "text-indigo-700",
  },
  sky: {
    rozet: "bg-gradient-to-br from-sky-500 to-sky-700 text-white shadow-sky-500/25",
    serit: "border-sky-100 bg-gradient-to-r from-sky-50 to-sky-50/20",
    cizgi: "bg-gradient-to-r from-sky-500 to-sky-400",
    parilti: "from-sky-500/10",
    metin: "text-sky-700",
  },
  emerald: {
    rozet: "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-emerald-500/25",
    serit: "border-emerald-100 bg-gradient-to-r from-emerald-50 to-emerald-50/20",
    cizgi: "bg-gradient-to-r from-emerald-500 to-emerald-400",
    parilti: "from-emerald-500/10",
    metin: "text-emerald-700",
  },
  amber: {
    rozet: "bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-amber-500/25",
    serit: "border-amber-100 bg-gradient-to-r from-amber-50 to-amber-50/20",
    cizgi: "bg-gradient-to-r from-amber-500 to-amber-400",
    parilti: "from-amber-500/10",
    metin: "text-amber-700",
  },
  rose: {
    rozet: "bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-rose-500/25",
    serit: "border-rose-100 bg-gradient-to-r from-rose-50 to-rose-50/20",
    cizgi: "bg-gradient-to-r from-rose-500 to-rose-400",
    parilti: "from-rose-500/10",
    metin: "text-rose-700",
  },
  violet: {
    rozet: "bg-gradient-to-br from-violet-500 to-violet-700 text-white shadow-violet-500/25",
    serit: "border-violet-100 bg-gradient-to-r from-violet-50 to-violet-50/20",
    cizgi: "bg-gradient-to-r from-violet-500 to-violet-400",
    parilti: "from-violet-500/10",
    metin: "text-violet-700",
  },
  teal: {
    rozet: "bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-teal-500/25",
    serit: "border-teal-100 bg-gradient-to-r from-teal-50 to-teal-50/20",
    cizgi: "bg-gradient-to-r from-teal-500 to-teal-400",
    parilti: "from-teal-500/10",
    metin: "text-teal-700",
  },
  slate: {
    rozet: "bg-gradient-to-br from-slate-500 to-slate-700 text-white shadow-slate-500/25",
    serit: "border-line bg-gradient-to-r from-sunken to-sunken/20",
    cizgi: "bg-gradient-to-r from-slate-400 to-slate-300",
    parilti: "from-slate-500/10",
    metin: "text-slate-700",
  },
};

export function modulTonu(renk: ModulRengi = "indigo"): ModulTonu {
  return MODUL_TONLARI[renk];
}
