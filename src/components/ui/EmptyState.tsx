import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Boş durum, "veri yok" demek yerine ne yapılacağını söyler.
 *
 * Panelde TEK boş durum dili bu: ikon + (başlık) + açıklama + (eylem).
 * UI incelemesi üç ayrı stil saydı (düz metin, kesikli kutu + ikon, gri
 * ortalanmış metin) ve varsayılan ikonun 8px'lik bir "○" karakteri
 * olduğunu yakaladı. Zemin nötr; vurgu yalnızca ikon rozetinde.
 *
 * Eski kullanım (`<EmptyState>metin</EmptyState>`) korunuyor: children tek
 * başına verilirse açıklama olarak gösterilir.
 */
export function EmptyState({
  baslik,
  children,
  aksiyon,
  ikon = <Inbox className="h-5 w-5" aria-hidden="true" />,
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
      className={`flex flex-col items-center rounded-card border border-dashed px-6 py-8 text-center ${
        tone === "hata" ? "border-danger/30 bg-danger-soft/40" : "border-line-strong bg-surface"
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex h-10 w-10 items-center justify-center rounded-full text-heading ring-1 ${
          tone === "hata"
            ? "bg-danger-soft text-danger-ink ring-danger/20"
            : "bg-accent-50 text-accent-700 ring-accent-100"
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
