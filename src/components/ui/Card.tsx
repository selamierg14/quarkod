import type { ReactNode } from "react";
import { modulTonu, type ModulRengi } from "@/lib/kimlik/modul-rengi";
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
        padded ? "p-4" : ""
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
 * Başlıklı bölüm kartı — panelin ana taşıyıcısı.
 *
 * Başlık şeridi NÖTR (bkz. lib/kimlik/modul-rengi.ts): önceden her kartın
 * üstünde modül renginde bir çizgi ve renkli bir şerit vardı; yan yana
 * beş kart beş renk demekti. Bölümün nerede başladığını artık ayırıcı
 * çizgi ve ikon rozeti söylüyor. İç boşluk 16px — yönetim panelinde
 * yoğunluk tercih ediliyor; 20px'lik boşluklar listeleri seyreltiyordu.
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
      <div
        className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b px-4 py-2.5 ${ton.serit}`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          {ikon ? (
            <span
              aria-hidden="true"
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-chip text-small ${ton.rozet}`}
            >
              {ikon}
            </span>
          ) : null}
          <h2 className="min-w-0 truncate text-body font-semibold text-ink">{title}</h2>
          {description ? <BilgiIpucu>{description}</BilgiIpucu> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={padded ? "p-4" : ""}>{children}</div>
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
 * Sayfa başlığı: her ekranın tepesinde aynı ritim.
 *
 * Kart DEĞİL, doğrudan zeminde. Önceden başlık gradyanlı bir kartın
 * içindeydi ve açıklama bir (i) rozetinin arkasına saklanıyordu: kart her
 * sayfada ~70px dikey alan harcıyor, açıklamayı ise kimse açmıyordu
 * (UI incelemesi, Ekim 2026). Artık başlık büyük (22px) ve sayfanın tek
 * ana eylemi sağında; açıklama altında tek paragraf.
 *
 * İkon her sayfada aynı yerde ve aynı boyutta: bazı başlıklarda olup
 * bazılarında olmaması sayfaların ayrı ayrı yazıldığı hissini veriyordu.
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
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {ikon ? (
          <span
            aria-hidden="true"
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-control ${ton.rozet}`}
          >
            {ikon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h1 className="text-display font-semibold text-balance text-ink">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-3xl text-small text-ink-muted">{description}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
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
