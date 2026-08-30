import type { ReactNode } from "react";
import { modulTonu, type ModulRengi } from "@/lib/modul-rengi";
import { BilgiIpucu } from "./BilgiIpucu";

/**
 * Panelin taşıyıcı yüzeyi. Gölge yerine ince bir çizgi + çok yumuşak gölge:
 * onlarca kart yan yana geldiğinde ağırlaşmasın.
 */
export function Card({
  children,
  className = "",
  padded = true,
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  /** "dikkat" düşük puanlı kayıt gibi öne çıkması gereken kartlar için. */
  tone?: "default" | "dikkat" | "sessiz";
}) {
  const TONES = {
    default: "bg-surface ring-line",
    dikkat: "bg-surface ring-danger/25",
    sessiz: "bg-sunken ring-line",
  } as const;

  return (
    <section
      className={`overflow-hidden rounded-card shadow-card ring-1 ${TONES[tone]} ${
        padded ? "p-5" : ""
      } ${className}`}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className = "",
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        <h2 className="text-heading font-semibold text-ink">{title}</h2>
        {description ? (
          <p className="mt-1 text-small text-ink-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/**
 * Başlığı renkli bir şeritte duran bölüm kartı.
 *
 * Panelde her bölüm "beyaz kutu + gri küçük başlık" kalıbıyla yazılıyordu;
 * on tanesi alt alta gelince hepsi aynı görünüyor, göz nereye bakacağını
 * bilemiyordu. Burada başlık kendi zeminine oturuyor: bölümün nerede
 * başladığı bir çizgiyle değil bir yüzeyle belli oluyor.
 */
export function SectionCard({
  title,
  description,
  action,
  ikon,
  renk = "slate",
  children,
  className = "",
  padded = true,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  ikon?: ReactNode;
  renk?: SayfaRengi;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  const ton = modulTonu(renk);
  return (
    <section
      className={`overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-line ${className}`}
    >
      {/* Kartın tepesindeki ince renk geçişi: on kart alt alta dizildiğinde
          hangisinin nerede başladığı çizgiyle değil renkle okunuyor. */}
      <div className={`h-0.5 w-full ${ton.cizgi}`} aria-hidden="true" />
      <div
        className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5 ${ton.serit}`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          {ikon ? (
            <span
              aria-hidden="true"
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-chip text-small shadow-sm ${ton.rozet}`}
            >
              {ikon}
            </span>
          ) : null}
          <h2 className="min-w-0 truncate text-body font-semibold text-ink">{title}</h2>
          {description ? <BilgiIpucu>{description}</BilgiIpucu> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

/**
 * Sayfa/bölüm renk teması. Tanımların kendisi `@/lib/modul-rengi` içinde
 * tek bir yerde duruyor; burası yalnızca panelin alışılmış adını koruyor.
 */
export type SayfaRengi = ModulRengi;
export { BilgiIpucu };

/**
 * Sayfa başlığı: her ekranın tepesinde aynı ritim, kendi rengi.
 *
 * Başlık düz bir satır değil, kendi yüzeyi olan bir bant: arkasında
 * modülün renginden çok soluk bir parıltı, solunda dolu renkli bir ikon
 * rozeti. Amaç, pazarlama sitesindeki kart diliyle aynı aileye girmek —
 * panel "tablolar listesi" değil, uygulama gibi dursun.
 */
export function PageHeader({
  title,
  description,
  action,
  ikon,
  renk = "indigo",
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  /** Genelde bir lucide ikonu; verilmezse rozet hiç çizilmez. */
  ikon?: ReactNode;
  renk?: SayfaRengi;
}) {
  const ton = modulTonu(renk);
  return (
    // Tek satır: açıklama (i) arkasında, başlık ile aksiyon aynı hizada.
    // Önceden iki satırlık açıklama her sayfanın tepesinde yer kaplıyor ve
    // asıl işi (tablo/form) aşağı itiyordu.
    <div className="relative flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-card bg-surface px-4 py-3 shadow-card ring-1 ring-line">
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r to-transparent ${ton.parilti}`}
      />
      <div className="relative flex min-w-0 items-center gap-2.5">
        {ikon ? (
          <span
            aria-hidden="true"
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-control shadow-md ${ton.rozet}`}
          >
            {ikon}
          </span>
        ) : null}
        <h1 className="min-w-0 truncate text-title font-semibold text-ink">{title}</h1>
        {description ? <BilgiIpucu>{description}</BilgiIpucu> : null}
      </div>
      {action ? <div className="relative shrink-0">{action}</div> : null}
    </div>
  );
}

/**
 * Açıklama metnini bir (i) rozetinin arkasına saklar.
 *
 * Sayfa ve kart başlıklarındaki iki satırlık açıklamalar her ekranın
 * tepesinde ~40px yer kaplıyor ve ilk okumadan sonra kimse tekrar
 * okumuyordu; asıl işi (tablo, form) aşağı itiyorlardı. Bilgi kaybolmuyor,
 * yalnızca istendiğinde açılıyor.
 *
 * JS yok: fareyle üstüne gelince ve klavyeyle odaklanınca açılıyor.
 * Dokunmatikte butona basmak odak verdiği için orada da çalışıyor.
 */
/** Kart içi bölüm başlığı; küçük, harfleri aralıklı, gürültüsüz. */
export function Overline({ children }: { children: ReactNode }) {
  return (
    <p className="text-overline font-semibold text-ink-muted uppercase">{children}</p>
  );
}
