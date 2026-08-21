import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FlaskConical } from "lucide-react";
import { markaStili } from "@/lib/marka";
import { VAKALAR } from "@/lib/vakalar";
import { Breadcrumb } from "../_landing/Breadcrumb";
import { Footer } from "../_landing/Footer";
import { Header } from "../_landing/Header";
import { StickyCta } from "../_landing/StickyCta";

export const metadata: Metadata = {
  title: "Vaka Çalışmaları",
  description:
    "QR ile geri bildirim toplayan işletmelerin hangi sorunu nasıl gördüğünü ve ne yaptığını adım adım anlatan senaryolar.",
  alternates: { canonical: "/vaka-calismalari" },
};

const MARKA_RENGI = "#4f46e5";

export default function VakalarPage() {
  return (
    <main data-marka style={markaStili(MARKA_RENGI)} className="min-h-dvh bg-canvas pb-24 lg:pb-0">
      <Header />
      <Breadcrumb adimlar={[{ ad: "Ana sayfa", href: "/" }, { ad: "Vaka çalışmaları" }]} />

      <section className="mx-auto max-w-6xl px-5 py-10">
        <h1 className="max-w-2xl text-display font-semibold tracking-tight text-ink">
          Sorunu görmek, tahmin etmekten hızlıdır
        </h1>
        <p className="mt-3 max-w-2xl text-body text-ink-soft">
          Aşağıdaki senaryolar, panelin hangi soruyu nasıl cevapladığını
          gösteriyor: puan neden düştü, sorun hangi vardiyada, hangi masada,
          hangi üründe.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {VAKALAR.map((vaka) => (
            <Link
              key={vaka.slug}
              href={`/vaka-calismalari/${vaka.slug}`}
              className="group flex flex-col rounded-card bg-surface p-6 shadow-card ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-raised"
            >
              {vaka.temsili ? (
                <span className="inline-flex w-fit items-center gap-1.5 rounded-chip bg-sunken px-2.5 py-1 text-caption font-medium text-ink-muted">
                  <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
                  Temsilî senaryo
                </span>
              ) : null}

              <h2 className="mt-3 text-title font-semibold text-ink">{vaka.isletme}</h2>
              <p className="mt-1 text-caption text-ink-faint">{vaka.tur}</p>
              <p className="mt-3 flex-1 text-small leading-relaxed text-ink-soft">
                {vaka.ozet}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-small font-semibold text-brand">
                Vakayı oku
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-8 rounded-control bg-surface px-5 py-4 text-small text-ink-muted ring-1 ring-line">
          <strong className="text-ink">Not:</strong> Bu sayfadaki vakalar
          gerçek müşteri adı ve rakamı içermiyor; ürünün nasıl kullanıldığını
          anlatan temsilî senaryolardır. Gerçek referanslarımızı, ilgili
          işletmenin yazılı onayıyla yayımlıyoruz.
        </p>
      </section>

      <Footer />
      <StickyCta />
    </main>
  );
}
