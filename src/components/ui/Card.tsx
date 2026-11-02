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
        <div className="flex min-w-0 items-center gap-2">
          {ikon ? (
            // Rozetsiz, soluk ikon: başlığın yanında yön verir, göz onu
            // başlıktan önce okumaz.
            <span aria-hidden="true" className="flex shrink-0 text-ink-faint">
              {ikon}
            </span>
          ) : null}
          <h2 className="min-w-0 truncate font-display text-[16px] font-semibold tracking-tight text-ink">{title}</h2>
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
  // `ikon` ve `renk` çağıranlar bozulmasın diye kabul ediliyor; yeni
  // tasarımda başlık ikonsuz — karakteri yazı tipi taşıyor.
  void ikon;
  void renk;
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-[28px] leading-[1.1] font-semibold tracking-[-0.02em] text-balance text-ink">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-3xl text-small text-ink-muted">{description}</p>
        ) : null}
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
    <p className="text-small font-semibold text-ink-muted">{children}</p>
  );
}

/**
 * Defter bölümü — kutusuz bölüm: başlık, altında koyu ince çizgi, içerik
 * doğrudan sayfada.
 *
 * Yeni panel tasarımının ("servis defteri") ana kalıbı. Kart dizisi
 * yerine sayfa gibi akan bölümler: UI incelemesi her şeyin çerçeveli
 * beyaz kutu olmasını "AI şablonu" hissinin kaynağı olarak gösterdi.
 * İçerik yatayda başlıkla aynı hizada başlar; satırlar kendi
 * aralarını ince çizgiyle ayırır.
 */
export function DefterBolumu({
  baslik,
  sayi,
  sayiTonu = "notr",
  aciklama,
  eylem,
  children,
  className = "",
}: {
  baslik: ReactNode;
  /** Başlığın yanındaki sayı (ör. bekleyen kayıt). */
  sayi?: number | string;
  sayiTonu?: "notr" | "dikkat";
  /** Başlığın sağında, soluk tek satır. */
  aciklama?: ReactNode;
  eylem?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`flex min-w-0 flex-col ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-ink pb-2">
        <h2 className="font-display text-[20px] font-semibold tracking-[-0.01em] text-ink">
          {baslik}
          {sayi !== undefined ? (
            <span className={`ml-2 ${sayiTonu === "dikkat" ? "text-danger" : "text-ink-faint"}`}>{sayi}</span>
          ) : null}
        </h2>
        <div className="flex items-baseline gap-3 text-small">
          {aciklama ? <span className="text-ink-faint">{aciklama}</span> : null}
          {eylem}
        </div>
      </div>
      {children}
    </section>
  );
}
