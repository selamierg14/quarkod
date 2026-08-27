import type { ReactNode } from "react";

/**
 * Kart üstündeki ince renk şeridi — panel tek düze durmasın diye.
 * Modül renkleriyle aynı geçiş dilini kullanır (bkz. lib/modul-rengi.ts):
 * özet kartları da panelin geri kalanıyla aynı aileden görünsün.
 */
const SERIT: Record<string, string> = {
  mavi: "bg-gradient-to-r from-sky-500 to-sky-400",
  yesil: "bg-gradient-to-r from-emerald-500 to-emerald-400",
  mor: "bg-gradient-to-r from-violet-500 to-violet-400",
  amber: "bg-gradient-to-r from-amber-500 to-amber-400",
};

/**
 * Özet ekranının taşıyıcısı. Rakam büyük ve tabular; yanındaki değişim
 * etiketi "iyi/kötü" yorumunu tek bakışta veriyor.
 */
export function StatCard({
  label,
  value,
  hint,
  accent,
  trend,
  tone = "default",
  renk,
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  /** İşletme rengi (yalnızca işletme kapsamındaki kartlarda). */
  accent?: string;
  /** Önceki döneme göre değişim; işaretiyle birlikte verilir. */
  trend?: { yon: "yukari" | "asagi" | "sabit"; metin: string; iyi?: boolean };
  tone?: "default" | "dikkat";
  /** Üstteki ince renk şeridi. */
  renk?: "mavi" | "yesil" | "mor" | "amber";
}) {
  return (
    <div
      className={`overflow-hidden rounded-card bg-surface shadow-card ring-1 ${
        tone === "dikkat" ? "ring-danger/25" : "ring-line"
      }`}
    >
      {renk ? <div className={`h-1 w-full ${SERIT[renk]}`} aria-hidden="true" /> : null}
      <div className="p-4">
        <div className="flex items-center gap-2">
          {accent ? (
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: accent }}
              aria-hidden="true"
            />
          ) : null}
          <p className="text-overline font-semibold text-ink-muted uppercase">{label}</p>
        </div>

        <div className="mt-2 flex items-end gap-2">
          <p className="text-metric font-semibold text-ink tabular">{value}</p>
          {trend ? (
            <span
              className={`mb-1 inline-flex items-center gap-0.5 text-caption font-medium ${
                trend.yon === "sabit"
                  ? "text-ink-muted"
                  : trend.iyi === false
                    ? "text-danger-ink"
                    : "text-success-ink"
              }`}
            >
              <span aria-hidden="true">
                {trend.yon === "yukari" ? "▲" : trend.yon === "asagi" ? "▼" : "■"}
              </span>
              {trend.metin}
            </span>
          ) : null}
        </div>

        {hint ? <p className="mt-1 text-caption text-ink-muted">{hint}</p> : null}
      </div>
    </div>
  );
}
