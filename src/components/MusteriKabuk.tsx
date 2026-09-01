import type { ReactNode } from "react";
import { markaStili } from "@/lib/marka";
import type { MetinAnahtari } from "@/lib/ceviriler";
import { IletisimBar } from "@/components/IletisimBar";
import { DilSaglayici } from "@/components/DilSaglayici";
import { DilSecici } from "@/components/DilSecici";
import { MasaEtiketi } from "@/components/MasaEtiketi";

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
  masaNo,
  girisMi,
  altBaslik,
  children,
  dar = true,
  kompakt = false,
}: {
  business: {
    name: string;
    brandColor: string;
    logoUrl: string | null;
    coverUrl: string | null;
    instagramUrl?: string | null;
    wifiSsid?: string | null;
    wifiPassword?: string | null;
  };
  masaNo: string;
  /** Masa kavramı olmayan mekânlarda tek ortak giriş QR'ı. */
  girisMi: boolean;
  /** Rozetin ikinci yarısı; çeviri anahtarı olarak geliyor. */
  altBaslik?: MetinAnahtari;
  children: ReactNode;
  /** Menü listesi biraz daha geniş duruyor. */
  dar?: boolean;
  /**
   * Hero'yu alçaltır.
   *
   * Karşılama ekranı markanın vitrini — orada büyük hero doğru. Ama menü ve
   * ankette müşterinin işi içerikte: 812 piksellik bir telefonda 500 piksel
   * hero, yemekleri ve ilk soruyu ekranın altına itiyordu. Bu ekranlarda
   * logo + ad küçülüp tek satıra iniyor.
   */
  kompakt?: boolean;
}) {
  const backdrop = business.coverUrl ?? business.logoUrl;
  const genislik = dar ? "max-w-md" : "max-w-lg";
  const bas = business.name.trim().charAt(0).toLocaleUpperCase("tr");

  return (
    // data-marka + --brand: müşteri ekranlarında bg-brand / text-brand-ink
    // yardımcıları işletmenin rengine bağlanır, marka rengi tek yerden akar.
    <DilSaglayici>
    <main data-marka style={markaStili(business.brandColor)} className="min-h-dvh bg-canvas">
      <div
        className={`relative z-30 w-full ${
          kompakt ? "h-36 sm:h-40" : "h-64 sm:h-72"
        }`}
      >
        <DilSecici />
        {/* Kapak/gradyan yalnızca bu katmanda kırpılır; içerik katmanı
            kırpılmaz, yoksa Wi-Fi açılır paneli hero'nun altında kesilirdi. */}
        <div className="absolute inset-0 overflow-hidden">
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
        </div>

        {/* Kompakt modda logo, ad ve masa rozeti tek yatay satırda; normal
            modda dikey yığılıp vitrin hâlini alıyor. */}
        <div
          className={`relative mx-auto flex h-full ${genislik} px-5 text-center ${
            kompakt
              ? "items-center gap-3 pb-5 text-start"
              : "flex-col items-center justify-end pb-9"
          }`}
        >
          {business.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={business.logoUrl}
              alt={`${business.name} logosu`}
              className={`shrink-0 rounded-2xl bg-surface object-cover shadow-pop ring-2 ring-white/70 ${
                kompakt ? "h-11 w-11" : "h-16 w-16"
              }`}
            />
          ) : (
            <div
              className={`flex shrink-0 items-center justify-center rounded-2xl bg-brand font-bold text-brand-ink shadow-pop ring-2 ring-white/70 ${
                kompakt ? "h-11 w-11 text-body" : "h-16 w-16 text-title"
              }`}
              aria-hidden="true"
            >
              {bas}
            </div>
          )}

          <div className={kompakt ? "min-w-0 flex-1" : "contents"}>
            <h1
              className={`font-semibold tracking-tight text-white drop-shadow-sm ${
                kompakt ? "truncate text-body" : "mt-3 text-title"
              }`}
            >
              {business.name}
            </h1>

            <MasaEtiketi masaNo={masaNo} girisMi={girisMi} altBaslik={altBaslik} />
          </div>

          <IletisimBar
            instagramUrl={business.instagramUrl ?? null}
            wifiSsid={business.wifiSsid ?? null}
            wifiPassword={business.wifiPassword ?? null}
          />
        </div>
      </div>

      {/* Panel: hero'nun üstüne biner, kavisli üst kenar masaya bırakılan
          bir kart hissi veriyor. */}
      <div className="relative -mt-6 rounded-t-[1.75rem] bg-canvas pb-10 shadow-[0_-12px_24px_-16px_rgba(15,23,42,0.25)]">
        <div className={`mx-auto ${genislik} px-4 pt-6`}>{children}</div>
      </div>
    </main>
    </DilSaglayici>
  );
}
