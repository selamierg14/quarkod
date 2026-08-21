import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { siteUrl } from "@/lib/site";

export type Adim = { ad: string; href?: string };

/**
 * Sayfa işareti yolu (breadcrumb).
 *
 * İki işi birden yapıyor: ziyaretçiye nerede olduğunu söylüyor ve arama
 * sonuçlarında adresin yerine okunabilir bir yol çıkması için BreadcrumbList
 * yapısal verisini basıyor.
 */
export function Breadcrumb({ adimlar }: { adimlar: Adim[] }) {
  const taban = siteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: adimlar.map((adim, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: adim.ad,
      ...(adim.href ? { item: `${taban}${adim.href}` } : {}),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Sayfa yolu" className="mx-auto max-w-6xl px-5 pt-6">
        <ol className="flex flex-wrap items-center gap-1 text-caption text-ink-muted">
          {adimlar.map((adim, i) => (
            <li key={adim.ad} className="flex items-center gap-1">
              {i > 0 ? (
                <ChevronRight className="h-3.5 w-3.5 text-ink-faint" aria-hidden="true" />
              ) : null}
              {adim.href ? (
                <Link href={adim.href} className="transition-colors hover:text-ink">
                  {adim.ad}
                </Link>
              ) : (
                <span className="font-medium text-ink-soft" aria-current="page">
                  {adim.ad}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
