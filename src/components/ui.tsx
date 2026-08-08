import { FEEDBACK_STATUSES, type FeedbackStatus } from "@/lib/constants";

export function Stars({ value, className = "" }: { value: number; className?: string }) {
  return (
    <span className={`whitespace-nowrap ${className}`} title={`${value}/5`}>
      <span className="text-amber-400">{"★".repeat(value)}</span>
      <span className="text-slate-300">{"★".repeat(5 - value)}</span>
    </span>
  );
}

const STATUS_STYLES: Record<FeedbackStatus, string> = {
  yeni: "bg-red-50 text-red-700 ring-red-100",
  incelendi: "bg-amber-50 text-amber-700 ring-amber-100",
  cozuldu: "bg-emerald-50 text-emerald-700 ring-emerald-100",
};

export function StatusBadge({ status }: { status: string }) {
  const key = (status in FEEDBACK_STATUSES ? status : "yeni") as FeedbackStatus;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${STATUS_STYLES[key]}`}
    >
      {FEEDBACK_STATUSES[key]}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <div className="flex items-center gap-2">
        {accent ? (
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: accent }}
          />
        ) : null}
        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
          {label}
        </p>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
