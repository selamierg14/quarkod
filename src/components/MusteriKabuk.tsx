import type { ReactNode } from "react";

/**
 * QR'la açılan sayfaların ortak görünümü: soluk arka plan, marka şeridi,
 * logo ve başlık.
 *
 * Karşılama, menü ve anket ekranlarının hepsi bunu kullanıyor; müşteri
 * aralarında gezinirken görüntü değişmesin diye tek yerde duruyor.
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
  // Arka plan görseli: kapak varsa o, yoksa logo. Sabitlenmiş ve kırpılmış
  // olarak tüm ekranı kaplar; üstüne konan beyaz perde sayesinde soluklaşır,
  // böylece metin okunur kalır ve görsel gerilmediği için bozulmaz.
  const backdrop = business.coverUrl ?? business.logoUrl;
  const genislik = dar ? "max-w-md" : "max-w-lg";

  return (
    <main className={`relative min-h-dvh ${backdrop ? "" : "bg-slate-50"}`}>
      {backdrop ? (
        <div className="pointer-events-none fixed inset-0 -z-10 bg-slate-50" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={backdrop}
            alt=""
            className="h-full w-full scale-110 object-cover blur-[3px]"
          />
          {/* Perde: görsel seçilir ama metin okunur kalır. Yüzde düşerse
              kartların üstündeki yazı zeminle karışmaya başlıyor. */}
          <div className="absolute inset-0 bg-slate-50/78" />
        </div>
      ) : null}

      <header className="relative">
        {/* Marka rengi şeridi: baskıdaki kartla aynı renk. */}
        <div
          className="h-1.5 w-full"
          style={{ backgroundColor: business.brandColor }}
          aria-hidden="true"
        />

        <div className={`mx-auto ${genislik} px-4`}>
          <div className="flex flex-col items-center pt-7 text-center">
            {business.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={business.logoUrl}
                alt={`${business.name} logosu`}
                className="h-24 w-24 rounded-full bg-white object-cover shadow-md ring-4 ring-white"
              />
            ) : (
              <div
                className="flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold text-white shadow-md ring-4 ring-white"
                style={{ backgroundColor: business.brandColor }}
                aria-hidden="true"
              >
                {business.name.trim().charAt(0).toLocaleUpperCase("tr")}
              </div>
            )}

            <h1 className="mt-3 text-xl font-semibold tracking-tight text-slate-900">
              {business.name}
            </h1>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-500">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {tableLabel}
              </span>
              {altBaslik}
            </p>
          </div>
        </div>
      </header>

      <div className={`relative mx-auto ${genislik} px-4 pt-6 pb-8`}>{children}</div>
    </main>
  );
}
