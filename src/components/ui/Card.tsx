import type { ReactNode } from "react";

/**
 * Panelin taşıyıcı yüzeyi. Gölge yerine ince bir çizgi + çok yumuşak gölge:
 * onlarca kart yan yana geldiğinde ağırlaşmasın.
 */
export function Card({
  children,
  className = "",
  padded = true,
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  /** "dikkat" düşük puanlı kayıt gibi öne çıkması gereken kartlar için. */
  tone?: "default" | "dikkat" | "sessiz";
}) {
  const TONES = {
    default: "bg-surface ring-line",
    dikkat: "bg-surface ring-danger/25",
    sessiz: "bg-sunken ring-line",
  } as const;

  return (
    <section
      className={`overflow-hidden rounded-card shadow-card ring-1 ${TONES[tone]} ${
        padded ? "p-5" : ""
      } ${className}`}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className = "",
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        <h2 className="text-heading font-semibold text-ink">{title}</h2>
        {description ? (
          <p className="mt-1 text-small text-ink-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/**
 * Başlığı renkli bir şeritte duran bölüm kartı.
 *
 * Panelde her bölüm "beyaz kutu + gri küçük başlık" kalıbıyla yazılıyordu;
 * on tanesi alt alta gelince hepsi aynı görünüyor, göz nereye bakacağını
 * bilemiyordu. Burada başlık kendi zeminine oturuyor: bölümün nerede
 * başladığı bir çizgiyle değil bir yüzeyle belli oluyor.
 */
export function SectionCard({
  title,
  description,
  action,
  ikon,
  renk = "slate",
  children,
  className = "",
  padded = true,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  ikon?: ReactNode;
  renk?: SayfaRengi;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={`overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-line ${className}`}
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5 ${SERIT[renk]}`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          {ikon ? (
            <span
              aria-hidden="true"
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-chip text-small ring-1 ${ROZET[renk]}`}
            >
              {ikon}
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className="text-body font-semibold text-ink">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-caption text-ink-muted">{description}</p>
            ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

/**
 * Sayfa başlığı rozetinin renk temaları.
 *
 * Her ekranın kendi rengi var: yönetici gün içinde on farklı sayfa
 * arasında geziniyor ve hepsi aynı beyaz-gri başlıkla açılınca "neredeyim"
 * duygusu kayboluyordu. Renk burada dekorasyon değil, konum işareti.
 * Tailwind sınıfları derleme anında tarandığı için tam sınıf adlarıyla
 * sabit bir eşleme tutuluyor.
 */
export type SayfaRengi =
  | "indigo"
  | "sky"
  | "emerald"
  | "amber"
  | "rose"
  | "violet"
  | "teal"
  | "slate";

const ROZET: Record<SayfaRengi, string> = {
  indigo: "bg-indigo-100 text-indigo-700 ring-indigo-200",
  sky: "bg-sky-100 text-sky-700 ring-sky-200",
  emerald: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-100 text-amber-700 ring-amber-200",
  rose: "bg-rose-100 text-rose-700 ring-rose-200",
  violet: "bg-violet-100 text-violet-700 ring-violet-200",
  teal: "bg-teal-100 text-teal-700 ring-teal-200",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
};

/** Bölüm başlığı şeridi — rozetle aynı aileden, çok daha soluk bir zemin. */
const SERIT: Record<SayfaRengi, string> = {
  indigo: "border-indigo-100 bg-indigo-50/60",
  sky: "border-sky-100 bg-sky-50/60",
  emerald: "border-emerald-100 bg-emerald-50/60",
  amber: "border-amber-100 bg-amber-50/60",
  rose: "border-rose-100 bg-rose-50/60",
  violet: "border-violet-100 bg-violet-50/60",
  teal: "border-teal-100 bg-teal-50/60",
  slate: "border-line bg-sunken",
};

/** Sayfa başlığı: her ekranın tepesinde aynı ritim, kendi rengi. */
export function PageHeader({
  title,
  description,
  action,
  ikon,
  renk = "indigo",
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  /** Emoji ya da kısa sembol; verilmezse rozet hiç çizilmez. */
  ikon?: ReactNode;
  renk?: SayfaRengi;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        {ikon ? (
          <span
            aria-hidden="true"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-chip text-lg ring-1 ${ROZET[renk]}`}
          >
            {ikon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h1 className="text-title font-semibold text-ink">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-small text-ink-muted">{description}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Kart içi bölüm başlığı; küçük, harfleri aralıklı, gürültüsüz. */
export function Overline({ children }: { children: ReactNode }) {
  return (
    <p className="text-overline font-semibold text-ink-muted uppercase">{children}</p>
  );
}
