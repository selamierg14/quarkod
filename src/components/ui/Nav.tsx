import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Filtre/dönem seçici (segment). Bağlantı tabanlı: sunucu bileşeninde de
 * çalışsın, geri tuşu filtreyi hatırlasın.
 */
export function SegmentGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex gap-1 rounded-control bg-sunken p-1 ring-1 ring-line"
    >
      {children}
    </div>
  );
}

export function SegmentLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-[0.5rem] px-3 py-1.5 text-small font-medium whitespace-nowrap transition ${
        active
          ? "bg-surface text-ink shadow-card ring-1 ring-line"
          : "text-ink-muted hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

/** Sekme çubuğu (panel gezinmesi). Aktif sekme altında ince çizgi. */
export function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative rounded-chip px-3 py-2.5 text-small font-medium whitespace-nowrap transition-colors ${
        active ? "text-ink" : "text-ink-muted hover:bg-sunken hover:text-ink-soft"
      }`}
    >
      {children}
      {active ? (
        <span
          aria-hidden="true"
          className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-ink-button"
        />
      ) : null}
    </Link>
  );
}

/** Müşteri menüsündeki kategori hapları. Aktif olan marka rengini alır. */
export function ChipLink({
  href,
  active = false,
  children,
}: {
  href: string;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className={`shrink-0 rounded-full px-3 py-1.5 text-small font-medium whitespace-nowrap shadow-card ring-1 transition ${
        active
          ? "bg-brand text-brand-ink ring-transparent"
          : "bg-surface/95 text-ink-soft ring-line"
      }`}
    >
      {children}
    </a>
  );
}

/** Sayfalama: 30'lu listeler için önceki/sonraki + konum bilgisi. */
export function Pagination({
  sayfa,
  toplamSayfa,
  href,
  toplamKayit,
}: {
  sayfa: number;
  toplamSayfa: number;
  /** Sayfa numarasını alıp adres üreten fonksiyon. */
  href: (sayfa: number) => string;
  toplamKayit?: number;
}) {
  if (toplamSayfa <= 1) return null;

  const stil =
    "inline-flex h-9 items-center rounded-control px-3 text-small font-medium ring-1 ring-line transition";
  const pasif = "text-ink-faint bg-sunken cursor-not-allowed";
  const aktif = "bg-surface text-ink-soft hover:bg-sunken";

  return (
    <nav
      aria-label="Sayfalama"
      className="flex items-center justify-between gap-3 text-small text-ink-muted"
    >
      <span className="tabular">
        Sayfa {sayfa} / {toplamSayfa}
        {toplamKayit !== undefined ? ` · ${toplamKayit} kayıt` : ""}
      </span>
      <span className="flex gap-2">
        {sayfa > 1 ? (
          <Link href={href(sayfa - 1)} className={`${stil} ${aktif}`}>
            ← Önceki
          </Link>
        ) : (
          <span className={`${stil} ${pasif}`} aria-disabled="true">
            ← Önceki
          </span>
        )}
        {sayfa < toplamSayfa ? (
          <Link href={href(sayfa + 1)} className={`${stil} ${aktif}`}>
            Sonraki →
          </Link>
        ) : (
          <span className={`${stil} ${pasif}`} aria-disabled="true">
            Sonraki →
          </span>
        )}
      </span>
    </nav>
  );
}
