import type { ReactNode } from "react";

export type AlertTone = "bilgi" | "uyari" | "hata" | "basari";

const TONES: Record<AlertTone, { kutu: string; ikon: string }> = {
  bilgi: { kutu: "bg-info-soft text-info-ink ring-info/20", ikon: "i" },
  uyari: { kutu: "bg-warning-soft text-warning-ink ring-warning/25", ikon: "!" },
  hata: { kutu: "bg-danger-soft text-danger-ink ring-danger/20", ikon: "!" },
  basari: { kutu: "bg-success-soft text-success-ink ring-success/20", ikon: "✓" },
};

/** Sayfa içi uyarı kutusu (abonelik uyarısı, bildirilmemiş izinler vb.). */
export function Alert({
  tone = "bilgi",
  baslik,
  children,
  aksiyon,
}: {
  tone?: AlertTone;
  baslik?: ReactNode;
  children?: ReactNode;
  aksiyon?: ReactNode;
}) {
  const t = TONES[tone];
  return (
    <div
      role={tone === "hata" ? "alert" : "status"}
      className={`flex flex-wrap items-start gap-3 rounded-card px-4 py-3 ring-1 ${t.kutu}`}
    >
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/70 text-caption font-bold"
      >
        {t.ikon}
      </span>
      <div className="min-w-0 flex-1 text-small">
        {baslik ? <p className="font-semibold">{baslik}</p> : null}
        {children ? <div className={baslik ? "mt-0.5" : ""}>{children}</div> : null}
      </div>
      {aksiyon ? <div className="shrink-0">{aksiyon}</div> : null}
    </div>
  );
}

/** Ekranın en üstüne yapışan sistem bandı (hesap görüntüleme, abonelik). */
export function SystemBanner({
  tone = "uyari",
  children,
  aksiyon,
}: {
  tone?: AlertTone;
  children: ReactNode;
  aksiyon?: ReactNode;
}) {
  const t = TONES[tone];
  return (
    <div
      className={`print-hidden flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-small ring-1 ring-inset ${t.kutu}`}
    >
      <span className="min-w-0">{children}</span>
      {aksiyon ? <span className="shrink-0">{aksiyon}</span> : null}
    </div>
  );
}
