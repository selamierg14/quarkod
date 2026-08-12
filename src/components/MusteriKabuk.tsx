import type { ReactNode } from "react";
import { markaStili } from "@/lib/marka";

/**
 * QR'la açılan sayfaların ortak görünümü.
 *
 * Koyu, atmosferik bir hero (kapak fotoğrafı ya da marka renginden üretilmiş
 * bir gradyan) ve onun üstüne binen yuvarlak köşeli bir panel — masaya
 * bırakılan bir menü kartı hissi versin diye. Karşılama, menü ve anket
 * ekranlarının hepsi bunu kullanıyor; müşteri aralarında gezinirken çerçeve
 * değişmesin diye tek yerde duruyor.
 */
export function MusteriKabuk({
  business,
  tableLabel,
  altBaslik,
  children,
  dar = true,
}: {
  business: {
    name: string;
    brandColor: string;
    logoUrl: string | null;
    coverUrl: string | null;
  };
  tableLabel: string;
  altBaslik?: string;
  children: ReactNode;
  /** Menü listesi biraz daha geniş duruyor. */
  dar?: boolean;
}) {
  const backdrop = business.coverUrl ?? business.logoUrl;
  const genislik = dar ? "max-w-md" : "max-w-lg";
  const bas = business.name.trim().charAt(0).toLocaleUpperCase("tr");

  return (
    // data-marka + --brand: müşteri ekranlarında bg-brand / text-brand-ink
    // yardımcıları işletmenin rengine bağlanır, marka rengi tek yerden akar.
    <main data-marka style={markaStili(business.brandColor)} className="min-h-dvh bg-canvas">
      <div className="relative h-64 w-full overflow-hidden sm:h-72">
        {backdrop ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={backdrop}
            alt=""
            className="absolute inset-0 h-full w-full scale-105 object-cover"
          />
        ) : (
          // Kapak fotoğrafı yoksa bile boş bir kutu yerine markanın kendi
          // renginden üretilmiş bir gradyan: her işletmede "tasarlanmış"
          // hissi versin.
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(155deg, var(--brand) 0%, color-mix(in oklab, var(--brand) 60%, black) 100%)",
            }}
          />
        )}

        {/* Alttan koyulaşan perde: hem yazı okunur kalır hem de panelin
            kavisiyle kaynaşacak bir zemin bırakır. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-black/10"
        />
        <div className="absolute inset-x-0 top-0 h-1 bg-brand" aria-hidden="true" />

        <div className={`relative mx-auto flex h-full ${genislik} flex-col items-center justify-end px-5 pb-9 text-center`}>
          {business.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={business.logoUrl}
              alt={`${business.name} logosu`}
              className="h-16 w-16 rounded-2xl bg-surface object-cover shadow-pop ring-2 ring-white/70"
            />
          ) : (
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-title font-bold text-brand-ink shadow-pop ring-2 ring-white/70"
              aria-hidden="true"
            >
              {bas}
            </div>
          )}

          <h1 className="mt-3 text-title font-semibold tracking-tight text-white drop-shadow-sm">
            {business.name}
          </h1>

          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-caption font-medium text-white/90 ring-1 ring-white/20 backdrop-blur-sm">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand" />
            {tableLabel}
            {altBaslik ? <span className="text-white/60">· {altBaslik}</span> : null}
          </p>
        </div>
      </div>

      {/* Panel: hero'nun üstüne biner, kavisli üst kenar masaya bırakılan
          bir kart hissi veriyor. */}
      <div className="relative -mt-6 rounded-t-[1.75rem] bg-canvas pb-10 shadow-[0_-12px_24px_-16px_rgba(15,23,42,0.25)]">
        <div className={`mx-auto ${genislik} px-4 pt-6`}>{children}</div>
      </div>
    </main>
  );
}
