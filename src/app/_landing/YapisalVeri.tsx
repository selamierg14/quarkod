import { SITE_ACIKLAMA, SITE_ADI, iletisimTelefonu, siteUrl } from "@/lib/site";

/**
 * Ana sayfanın yapısal verisi (JSON-LD).
 *
 * Google'ın "zengin sonuç" üretebilmesi için üç şema birden veriliyor:
 * kuruluş kimliği, ürünün ne olduğu (fiyat aralığıyla) ve SSS. SSS şeması
 * arama sonucunda soruların açılır olarak çıkmasını sağlıyor — sayfadaki
 * metinle birebir aynı olmak zorunda, o yüzden aynı diziden besleniyor.
 */
export function YapisalVeri({
  sorular,
}: {
  sorular: { s: string; c: string }[];
}) {
  const taban = siteUrl();
  const tel = iletisimTelefonu();

  const kurulus = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_ADI,
    url: taban,
    description: SITE_ACIKLAMA,
    ...(tel
      ? {
          contactPoint: {
            "@type": "ContactPoint",
            telephone: tel,
            contactType: "sales",
            areaServed: "TR",
            availableLanguage: ["Turkish"],
          },
        }
      : {}),
  };

  const urun = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_ADI,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: SITE_ACIKLAMA,
    url: taban,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "TRY",
      lowPrice: "349",
      highPrice: "1290",
      offerCount: "3",
    },
  };

  const sss = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: sorular.map((soru) => ({
      "@type": "Question",
      name: soru.s,
      acceptedAnswer: { "@type": "Answer", text: soru.c },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify([kurulus, urun, sss]),
      }}
    />
  );
}
