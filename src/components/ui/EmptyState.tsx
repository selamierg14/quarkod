import type { ReactNode } from "react";

/**
 * Boş durum, "veri yok" demek yerine ne yapılacağını söyler.
 *
 * Eski kullanım (`<EmptyState>metin</EmptyState>`) korunuyor: children tek
 * başına verilirse açıklama olarak gösterilir.
 */
export function EmptyState({
  baslik,
  children,
  aksiyon,
  ikon = "○",
  tone = "default",
}: {
  baslik?: ReactNode;
  children: ReactNode;
  aksiyon?: ReactNode;
  ikon?: ReactNode;
  tone?: "default" | "hata";
}) {
  return (
    <div
      className={`flex flex-col items-center rounded-card border border-dashed px-6 py-10 text-center ${
        tone === "hata"
          ? "border-danger/30 bg-danger-soft/40"
          : "border-accent-200 bg-gradient-to-b from-accent-50/60 to-surface"
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex h-12 w-12 items-center justify-center rounded-full text-heading ring-1 ${
          tone === "hata"
            ? "bg-danger-soft text-danger-ink ring-danger/20"
            : "bg-accent-100 text-accent-700 ring-accent-200"
        }`}
      >
        {ikon}
      </span>
      {baslik ? (
        <h3 className="mt-3 text-heading font-semibold text-ink">{baslik}</h3>
      ) : null}
      <p className="mt-1.5 max-w-sm text-small text-ink-muted">{children}</p>
      {aksiyon ? <div className="mt-4">{aksiyon}</div> : null}
    </div>
  );
}
