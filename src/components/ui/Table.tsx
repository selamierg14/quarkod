import type { ComponentProps, ReactNode } from "react";

/**
 * Tablo dili: dar satır yüksekliği (veri yoğunluğu), sayılar sağa dayalı ve
 * tabular, başlık satırı yapışkan. Kart içinde yatay kaydırma kabuğuyla
 * gelir; dar ekranda sayfanın kendisi yana kaymaz.
 */
export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-line">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function Table({ children, className = "" }: ComponentProps<"table">) {
  return <table className={`w-full text-small ${className}`}>{children}</table>;
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="sticky top-0 z-10 bg-sunken/95 text-left backdrop-blur">
      {children}
    </thead>
  );
}

export function TH({
  children,
  align = "left",
  className = "",
}: {
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-2.5 text-overline font-semibold text-ink-muted uppercase ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      {children}
    </th>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-line">{children}</tbody>;
}

export function TR({
  children,
  vurgu = false,
  className = "",
}: {
  children: ReactNode;
  /** Şikayet/düşük puan satırı: solda ince kırmızı şerit. */
  vurgu?: boolean;
  className?: string;
}) {
  return (
    <tr
      className={`transition-colors hover:bg-sunken/70 ${
        vurgu ? "bg-danger-soft/35 shadow-[inset_3px_0_0_0_var(--color-danger)]" : ""
      } ${className}`}
    >
      {children}
    </tr>
  );
}

export function TD({
  children,
  align = "left",
  className = "",
  ...rest
}: ComponentProps<"td"> & { align?: "left" | "right" }) {
  return (
    <td
      {...rest}
      className={`px-4 py-2.5 align-middle text-ink-soft ${
        align === "right" ? "text-right tabular" : ""
      } ${className}`}
    >
      {children}
    </td>
  );
}
