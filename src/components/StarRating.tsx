"use client";

type Props = {
  value: number;
  onChange: (value: number) => void;
  /** "lg" ana puan için, "sm" kategori satırları için. */
  size?: "sm" | "lg";
  label?: string;
  name: string;
};

const LABELS = ["Çok kötü", "Kötü", "İdare eder", "İyi", "Harika"];

export function StarRating({ value, onChange, size = "sm", label, name }: Props) {
  const big = size === "lg";

  return (
    <div className={big ? "flex flex-col items-center gap-2" : ""}>
      {label ? (
        <span className="text-[15px] text-slate-700">{label}</span>
      ) : null}
      <div
        role="radiogroup"
        aria-label={label ?? "Puan"}
        className={`flex ${big ? "gap-2" : "gap-1"}`}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const active = star <= value;
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={value === star}
              aria-label={`${star} yıldız — ${LABELS[star - 1]}`}
              onClick={() => onChange(star)}
              className={`
                flex items-center justify-center rounded-full transition-transform
                active:scale-90 touch-manipulation
                ${big ? "h-12 w-12" : "h-9 w-9"}
                ${active ? "text-amber-400" : "text-slate-300"}
              `}
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className={big ? "h-11 w-11" : "h-7 w-7"}
                aria-hidden="true"
              >
                <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.35l-5.81 3.05 1.11-6.47-4.7-4.58 6.5-.95L12 2.5z" />
              </svg>
            </button>
          );
        })}
      </div>
      {big && value > 0 ? (
        <span className="text-sm font-medium text-slate-600">
          {LABELS[value - 1]}
        </span>
      ) : null}
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
