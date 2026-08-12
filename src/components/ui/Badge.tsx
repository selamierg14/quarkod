import type { ReactNode } from "react";
import { FEEDBACK_STATUSES, type FeedbackStatus } from "@/lib/constants";

export type BadgeTone = "notr" | "basari" | "uyari" | "hata" | "bilgi" | "vurgu";

const TONES: Record<BadgeTone, string> = {
  notr: "bg-sunken text-ink-soft ring-line",
  basari: "bg-success-soft text-success-ink ring-success/20",
  uyari: "bg-warning-soft text-warning-ink ring-warning/25",
  hata: "bg-danger-soft text-danger-ink ring-danger/20",
  bilgi: "bg-info-soft text-info-ink ring-info/20",
  vurgu: "bg-accent-50 text-accent-700 ring-accent-200",
};

export function Badge({
  tone = "notr",
  children,
  title,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-medium ring-1 ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

const STATUS_TONE: Record<FeedbackStatus, BadgeTone> = {
  yeni: "hata",
  incelendi: "uyari",
  cozuldu: "basari",
};

export function StatusBadge({ status }: { status: string }) {
  const key = (status in FEEDBACK_STATUSES ? status : "yeni") as FeedbackStatus;
  return (
    <Badge tone={STATUS_TONE[key]}>
      <span aria-hidden="true" className="text-[8px] leading-none">
        ●
      </span>
      {FEEDBACK_STATUSES[key]}
    </Badge>
  );
}

export function Stars({
  value,
  className = "",
  size = "sm",
}: {
  value: number;
  className?: string;
  size?: "sm" | "md";
}) {
  const dolu = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span
      className={`inline-flex items-center gap-0.5 whitespace-nowrap ${className}`}
      title={`${value}/5`}
      aria-label={`${value} / 5 yıldız`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
          className={`${size === "md" ? "h-5 w-5" : "h-3.5 w-3.5"} ${
            i <= dolu ? "text-rating" : "text-rating-empty"
          }`}
        >
          <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.35l-5.81 3.05 1.11-6.47-4.7-4.58 6.5-.95L12 2.5z" />
        </svg>
      ))}
    </span>
  );
}

/**
 * Puan barı: 3'ün altı kırmızı, 4'ün altı sarı, üstü yeşil.
 * Kırılım ve ürün ekranlarındaki renk mantığı tek yerde tanımlı olsun ki
 * iki ekran birbirinden ayrışmasın.
 */
export function puanRengi(ortalama: number): string {
  if (ortalama < 3) return "bg-danger";
  if (ortalama < 4) return "bg-warning";
  return "bg-success";
}

export function ScoreBar({
  value,
  className = "",
}: {
  /** 0–5 arası ortalama. */
  value: number;
  className?: string;
}) {
  const oran = Math.max(0, Math.min(1, value / 5));
  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-sunken ring-1 ring-line ${className}`}
      role="img"
      aria-label={`${value.toFixed(1)} / 5`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${puanRengi(value)}`}
        style={{ width: `${oran * 100}%` }}
      />
    </div>
  );
}
