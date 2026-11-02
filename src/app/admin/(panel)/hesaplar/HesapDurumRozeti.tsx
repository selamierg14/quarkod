/**
 * Hesabın tek bakışta durumu: askıda / süresi doldu / N gün kaldı / aktif.
 *
 * Liste ve detay aynı rozeti kullanıyor. Renk + metin birlikte: renk
 * görmeyen biri de durumu okuyabilsin (UI incelemesi, erişilebilirlik).
 */
export function HesapDurumRozeti({
  active,
  calisiyor,
  gun,
}: {
  /** Elle askıya alınmamış mı. */
  active: boolean;
  /** Askıda değil VE süresi dolmamış. */
  calisiyor: boolean;
  /** Bitişe kalan gün; süresizse null. */
  gun: number | null;
}) {
  const [metin, sinif] = !active
    ? ["Askıda", "bg-danger-soft text-danger-ink"]
    : !calisiyor
      ? ["Süresi doldu", "bg-danger-soft text-danger-ink"]
      : gun !== null && gun <= 14
        ? [`${gun} gün kaldı`, "bg-warning-soft text-warning-ink"]
        : ["Aktif", "bg-success-soft text-success-ink"];
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-chip px-2 py-0.5 text-caption font-medium ${sinif}`}
    >
      {metin}
    </span>
  );
}
