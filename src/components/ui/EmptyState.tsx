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
        tone === "hata" ? "border-danger/30 bg-danger-soft/40" : "border-line-strong bg-surface"
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex h-11 w-11 items-center justify-center rounded-full text-heading ${
          tone === "hata" ? "bg-danger-soft text-danger-ink" : "bg-sunken text-ink-faint"
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
