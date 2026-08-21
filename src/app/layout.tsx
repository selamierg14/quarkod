import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SITE_ACIKLAMA, SITE_ADI, siteUrl } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

/**
 * Site geneli metadata.
 *
 * `metadataBase` olmadan Open Graph görselleri ve kanonik adresler göreli
 * kalıyor; paylaşımda önizleme çıkmıyor. `title.template` ise her alt
 * sayfanın kendi başlığını marka adıyla birleştiriyor — böylece iki sayfa
 * aynı başlıkla indekslenmiyor.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${SITE_ADI} — QR ile Müşteri Memnuniyet Sistemi`,
    template: `%s · ${SITE_ADI}`,
  },
  description: SITE_ACIKLAMA,
  applicationName: SITE_ADI,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "/",
    siteName: SITE_ADI,
    title: `${SITE_ADI} — QR ile Müşteri Memnuniyet Sistemi`,
    description: SITE_ACIKLAMA,
    images: [
      {
        url: "/marketing/admin-dashboard.png",
        width: 1200,
        height: 630,
        alt: `${SITE_ADI} yönetim panelinin özet ekranı`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_ADI} — QR ile Müşteri Memnuniyet Sistemi`,
    description: SITE_ACIKLAMA,
    images: ["/marketing/admin-dashboard.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  // Search Console doğrulaması: değer .env'den gelir, yoksa etiket basılmaz.
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full bg-canvas text-ink">{children}</body>
    </html>
  );
}
