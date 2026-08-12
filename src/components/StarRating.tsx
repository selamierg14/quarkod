"use client";

import { useRef } from "react";

type Props = {
  value: number;
  onChange: (value: number) => void;
  /** "lg" ana puan için, "sm" kategori satırları için. */
  size?: "sm" | "lg";
  label?: string;
  /**
   * Ekran okuyucuya okunacak ad. Kategori/ürün adı görsel olarak yandaki
   * satırda durduğu için `label` kullanılmıyor; bu geçilmezse aynı sayfadaki
   * onlarca yıldız grubu ekran okuyucuda ayırt edilemez hale gelir.
   */
  ariaLabel?: string;
  name: string;
};

const LABELS = ["Çok kötü", "Kötü", "İdare eder", "İyi", "Harika"];

export function StarRating({
  value,
  onChange,
  size = "sm",
  label,
  ariaLabel,
  name,
}: Props) {
  const big = size === "lg";
  const groupRef = useRef<HTMLDivElement>(null);

  /**
   * radiogroup'un klavye sözleşmesi: gruba tek Tab durağı düşer, seçim ok
   * tuşlarıyla değişir. Bunu uygulamadan role="radiogroup" ilan etmek, ekran
   * okuyucu kullanıcısına tutmayacağımız bir söz vermek olurdu.
   */
  function handleKeyDown(event: React.KeyboardEvent, star: number) {
    const ileri = event.key === "ArrowRight" || event.key === "ArrowDown";
    const geri = event.key === "ArrowLeft" || event.key === "ArrowUp";
    if (!ileri && !geri && event.key !== "Home" && event.key !== "End") return;

    event.preventDefault();

    let hedef = star;
    if (ileri) hedef = star >= 5 ? 1 : star + 1;
    else if (geri) hedef = star <= 1 ? 5 : star - 1;
    else if (event.key === "Home") hedef = 1;
    else if (event.key === "End") hedef = 5;

    onChange(hedef);
    groupRef.current
      ?.querySelectorAll<HTMLButtonElement>("[role=radio]")
      [hedef - 1]?.focus();
  }

  // Seçim yokken ilk yıldız tab durağı olur; seçim varsa seçili olan.
  const tabStop = value === 0 ? 1 : value;

  return (
    <div className={big ? "flex flex-col items-center gap-2" : ""}>
      {label ? <span className="text-body text-ink-soft">{label}</span> : null}

      <div
        ref={groupRef}
        role="radiogroup"
        aria-label={ariaLabel ?? label ?? "Genel memnuniyet puanı"}
        className={`flex ${big ? "gap-1.5" : "gap-0.5"}`}
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
              tabIndex={star === tabStop ? 0 : -1}
              onClick={() => onChange(star)}
              onKeyDown={(event) => handleKeyDown(event, star)}
              className={`
                flex touch-manipulation items-center justify-center rounded-full
                transition-transform duration-100 outline-none
                focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-1
                active:scale-90
                ${big ? "h-12 w-12" : "h-9 w-9"}
                ${active ? "text-rating" : "text-rating-empty"}
              `}
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className={big ? "h-10 w-10" : "h-7 w-7"}
                aria-hidden="true"
              >
                <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.35l-5.81 3.05 1.11-6.47-4.7-4.58 6.5-.95L12 2.5z" />
              </svg>
            </button>
          );
        })}
      </div>

      {big ? (
        // Yükseklik sabit: seçim yapılınca sayfa zıplamasın.
        <span className="h-5 text-small font-medium text-ink-soft">
          {value > 0 ? LABELS[value - 1] : ""}
        </span>
      ) : null}

      <input type="hidden" name={name} value={value} />
    </div>
  );
}
