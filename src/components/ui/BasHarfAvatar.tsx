/**
 * Baş harfli avatar — listelerde satırın başlangıcını gözle yakalatır.
 *
 * Önceden bütün kullanıcılar aynı gri insan ikonuyla görünüyordu (UI
 * incelemesi); yetmiş satırlık bir listede kimse kimseden ayrışmıyordu.
 * Renk adın kendisinden türüyor: aynı kişi her ekranda aynı renkte.
 * Palet bilinçli olarak soluk zeminli — durum renkleriyle (yeşil/kırmızı)
 * karışmasın, yalnızca kimlik ayırsın.
 */
const RENKLER = [
  "bg-indigo-100 text-indigo-800",
  "bg-sky-100 text-sky-800",
  "bg-teal-100 text-teal-800",
  "bg-violet-100 text-violet-800",
  "bg-fuchsia-100 text-fuchsia-800",
  "bg-orange-100 text-orange-800",
  "bg-lime-100 text-lime-800",
  "bg-cyan-100 text-cyan-800",
];

function basHarfler(ad: string): string {
  const parcalar = ad.trim().split(/\s+/).filter(Boolean);
  const ilk = parcalar[0]?.charAt(0) ?? "?";
  const son = parcalar.length > 1 ? parcalar[parcalar.length - 1].charAt(0) : "";
  return (ilk + son).toLocaleUpperCase("tr");
}

function renkSec(ad: string): string {
  let h = 0;
  for (const harf of ad) h = (h * 31 + harf.charCodeAt(0)) >>> 0;
  return RENKLER[h % RENKLER.length];
}

export function BasHarfAvatar({ ad, soluk = false }: { ad: string; soluk?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-caption font-semibold ${
        soluk ? "bg-sunken text-ink-faint" : renkSec(ad)
      }`}
    >
      {basHarfler(ad)}
    </span>
  );
}
