import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, FlaskConical } from "lucide-react";
import { markaStili } from "@/lib/marka";
import { VAKALAR, vakaBul } from "@/lib/vakalar";
import { Breadcrumb } from "../../_landing/Breadcrumb";
import { Footer } from "../../_landing/Footer";
import { Header } from "../../_landing/Header";
import { StickyCta } from "../../_landing/StickyCta";

const MARKA_RENGI = "#4f46e5";

/** Üç vaka da derleme anında üretilsin: statik sayfa hem hızlı hem taranabilir. */
export function generateStaticParams() {
  return VAKALAR.map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const vaka = vakaBul(slug);
  if (!vaka) return { title: "Vaka bulunamadı" };

  // Her vakanın kendi başlığı ve açıklaması var: aynı metinle indekslenen
  // iki sayfa, ikisinin de sıralamasını düşürüyor.
  return {
    title: `${vaka.isletme} — Vaka Çalışması`,
    description: vaka.ozet,
    alternates: { canonical: `/vaka-calismalari/${vaka.slug}` },
    openGraph: {
      type: "article",
      title: `${vaka.isletme} — Vaka Çalışması`,
      description: vaka.ozet,
      url: `/vaka-calismalari/${vaka.slug}`,
    },
  };
}

export default async function VakaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const vaka = vakaBul(slug);
  if (!vaka) notFound();

  const digerleri = VAKALAR.filter((v) => v.slug !== vaka.slug);

  return (
    <main data-marka style={markaStili(MARKA_RENGI)} className="min-h-dvh bg-canvas pb-24 lg:pb-0">
      <Header />
      <Breadcrumb
        adimlar={[
          { ad: "Ana sayfa", href: "/" },
          { ad: "Vaka çalışmaları", href: "/vaka-calismalari" },
          { ad: vaka.isletme },
        ]}
      />

      <article className="mx-auto max-w-3xl px-5 py-10">
        {vaka.temsili ? (
          <span className="inline-flex items-center gap-1.5 rounded-chip bg-sunken px-2.5 py-1 text-caption font-medium text-ink-muted">
            <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
            Temsilî senaryo — gerçek müşteri adı ve rakamı içermez
          </span>
        ) : null}

        <h1 className="mt-3 text-display font-semibold tracking-tight text-ink">
          {vaka.isletme}
        </h1>
        <p className="mt-1 text-caption text-ink-faint">{vaka.tur}</p>
        <p className="mt-4 text-body leading-relaxed text-ink-soft">{vaka.ozet}</p>

        <section className="mt-10">
          <h2 className="text-title font-semibold text-ink">Sorun</h2>
          <p className="mt-3 text-body leading-relaxed text-ink-soft">{vaka.sorun}</p>
        </section>

        <section className="mt-8">
          <h2 className="text-title font-semibold text-ink">Ne yapıldı</h2>
          <ul className="mt-3 flex flex-col gap-2.5">
            {vaka.cozum.map((adim) => (
              <li key={adim} className="flex gap-2.5 text-body leading-relaxed text-ink-soft">
                <Check className="mt-1 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                <span>{adim}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-title font-semibold text-ink">Sonuç</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {vaka.sonuc.map((s) => (
              <div
                key={s.etiket}
                className="rounded-card bg-surface p-4 shadow-card ring-1 ring-line"
              >
                <p className="text-caption font-medium tracking-wide text-ink-muted uppercase">
                  {s.etiket}
                </p>
                <p className="mt-1 text-title font-semibold text-ink">{s.deger}</p>
                <p className="mt-1 text-caption leading-relaxed text-ink-muted">{s.not}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-card bg-ink p-6 text-white">
          <h2 className="text-title font-semibold">Aynı soruyu kendi işletmeniz için sorun</h2>
          <p className="mt-2 text-small text-white/75">
            Masaya bir QR koyun, 7 gün boyunca ücretsiz izleyin. Kredi kartı
            istemiyoruz.
          </p>
          <Link
            href="/deneme"
            className="mt-4 inline-flex items-center gap-2 rounded-control bg-brand px-5 py-3 text-small font-semibold text-brand-ink"
          >
            7 gün ücretsiz dene
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>

        {/* İç linkleme: okuyucuyu çıkmaz sokakta bırakmamak ve tarayıcının
            diğer vakalara ulaşmasını sağlamak için. */}
        <section className="mt-10 border-t border-line pt-6">
          <h2 className="text-heading font-semibold text-ink">Diğer vakalar</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {digerleri.map((d) => (
              <li key={d.slug}>
                <Link
                  href={`/vaka-calismalari/${d.slug}`}
                  className="group flex items-baseline gap-2 text-small text-ink-soft transition-colors hover:text-ink"
                >
                  <ArrowRight
                    className="h-3.5 w-3.5 shrink-0 translate-y-0.5 text-ink-faint transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                  <span>
                    <span className="font-medium">{d.isletme}</span>
                    <span className="text-ink-faint"> — {d.tur}</span>
                  </span>
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/vaka-calismalari"
                className="text-small font-medium text-brand underline underline-offset-2"
              >
                Tüm vaka çalışmaları
              </Link>
            </li>
          </ul>
        </section>
      </article>

      <Footer />
      <StickyCta />
    </main>
  );
}
