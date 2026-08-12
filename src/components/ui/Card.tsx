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

/** Sayfa başlığı: her ekranın tepesinde aynı ritim. */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-title font-semibold text-ink">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-small text-ink-muted">{description}</p>
        ) : null}
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
