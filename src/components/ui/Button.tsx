import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "destructive"
  | "ghost"
  /** Yalnızca müşteri ekranlarında: işletmenin kendi rengiyle boyanır. */
  | "brand";

export type ButtonSize = "sm" | "md" | "lg";

/**
 * Birincil ve yıkıcı düğmeler düz renk yerine renk geçişi taşıyor: panelin
 * kart şeritleri, modül rozetleri ve sekmeleriyle aynı dil. Düz bir renk
 * lekesi "form", geçişli bir yüzey "uygulama" hissi veriyor.
 */
const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-b from-accent-600 to-accent-700 text-white shadow-card shadow-accent-700/20 hover:brightness-110 active:scale-[0.99]",
  secondary:
    "bg-surface text-ink-soft ring-1 ring-line hover:bg-sunken hover:text-ink active:scale-[0.99]",
  destructive:
    "bg-gradient-to-b from-danger to-danger-ink text-white shadow-card shadow-danger/20 hover:brightness-110 active:scale-[0.99]",
  ghost: "text-ink-muted hover:bg-sunken hover:text-ink",
  brand: "bg-brand text-brand-ink shadow-card hover:brightness-[0.97] active:scale-[0.99]",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 px-3 text-small",
  md: "h-10 gap-2 px-4 text-body",
  // Mobilde tek elle basılan ana aksiyon: 48px dokunma hedefi.
  lg: "h-12 gap-2 px-5 text-body",
};

export function buttonClass({
  variant = "primary",
  size = "md",
  block = false,
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
} = {}): string {
  return [
    "inline-flex items-center justify-center rounded-control font-medium",
    "transition-[background-color,color,transform,box-shadow] duration-150",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600",
    // Devre dışı düğme tıklanabilir görünmemeli ama kaybolmamalı da:
    // kullanıcı neyin orada olduğunu bilmeli.
    "disabled:pointer-events-none disabled:opacity-45",
    VARIANTS[variant],
    SIZES[size],
    block ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  loading?: boolean;
  /** Yükleme sırasında düğmenin içine yazılacak metin. */
  loadingLabel?: string;
};

export function Button({
  variant,
  size,
  block,
  loading = false,
  loadingLabel,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass({ variant, size, block, className })}
    >
      {loading ? <Spinner /> : null}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  block,
  className,
  children,
  ...rest
}: ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
}) {
  return (
    <Link {...rest} className={buttonClass({ variant, size, block, className })}>
      {children}
    </Link>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-4 w-4 shrink-0 animate-spin ${className}`}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Aksiyon grubu: formların altındaki düğme sırası her yerde aynı hizada. */
export function ButtonRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}
