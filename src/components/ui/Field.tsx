import type { ComponentProps, ReactNode } from "react";

/**
 * Form dili: etiket üstte, yardımcı metin altında, hata yardımcı metnin
 * yerini alır. Üç ayrı yerde üç ayrı düzen kurmak yerine tek sarmalayıcı.
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className = "",
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="text-small font-medium text-ink-soft">
        {label}
        {required ? (
          <span className="ml-0.5 text-danger" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p className="flex items-start gap-1.5 text-caption text-danger-ink">
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="text-caption text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}

const CONTROL = [
  "w-full rounded-control bg-surface text-body text-ink",
  "ring-1 ring-line placeholder:text-ink-faint",
  "transition-[box-shadow,background-color] duration-150",
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600",
  "disabled:bg-sunken disabled:text-ink-faint disabled:cursor-not-allowed",
  // 16px altı yazı tipi mobil Safari'de sayfayı zumlatıyor; gövde ölçüsü
  // (15px) yerine input'larda 16px kullanıyoruz.
  "text-[16px] sm:text-body",
].join(" ");

const HATALI = "ring-danger focus-visible:ring-danger";

export function Input({
  invalid,
  className = "",
  ...rest
}: ComponentProps<"input"> & { invalid?: boolean }) {
  return (
    <input
      {...rest}
      aria-invalid={invalid || undefined}
      className={`${CONTROL} h-10 px-3 ${invalid ? HATALI : ""} ${className}`}
    />
  );
}

export function Textarea({
  invalid,
  className = "",
  ...rest
}: ComponentProps<"textarea"> & { invalid?: boolean }) {
  return (
    <textarea
      {...rest}
      aria-invalid={invalid || undefined}
      className={`${CONTROL} resize-none p-3 ${invalid ? HATALI : ""} ${className}`}
    />
  );
}

export function Select({
  invalid,
  className = "",
  children,
  ...rest
}: ComponentProps<"select"> & { invalid?: boolean }) {
  return (
    <select
      {...rest}
      aria-invalid={invalid || undefined}
      className={`${CONTROL} h-10 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="%2364748b"><path d="M5.5 7.5 10 12l4.5-4.5z"/></svg>')] bg-[length:20px_20px] bg-[right_0.5rem_center] bg-no-repeat px-3 pr-9 ${
        invalid ? HATALI : ""
      } ${className}`}
    >
      {children}
    </select>
  );
}

/** Onay kutusu: dokunma hedefi büyük, metin tıklanabilir. */
export function Checkbox({
  label,
  description,
  className = "",
  ...rest
}: ComponentProps<"input"> & { label: ReactNode; description?: ReactNode }) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 text-body text-ink-soft ${className}`}
    >
      <input
        {...rest}
        type="checkbox"
        className="mt-0.5 h-5 w-5 shrink-0 rounded-[6px] border-line-strong text-accent-600 accent-[var(--color-accent-600)]"
      />
      <span>
        {label}
        {description ? (
          <span className="mt-0.5 block text-caption text-ink-muted">{description}</span>
        ) : null}
      </span>
    </label>
  );
}

/** Form geri bildirimi: kaydedildi / hata. Formun altında, sabit yükseklikte. */
export function FormFeedback({
  tone,
  children,
}: {
  tone: "ok" | "hata";
  children: ReactNode;
}) {
  return (
    <p
      role="status"
      className={`flex items-center gap-1.5 text-small ${
        tone === "ok" ? "text-success-ink" : "text-danger-ink"
      }`}
    >
      <span aria-hidden="true">{tone === "ok" ? "✓" : "⚠"}</span>
      {children}
    </p>
  );
}
