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
  // Paylaşım görseli belirtilmiyor: kök dizindeki opengraph-image.tsx
  // (marka renkleriyle üretilen 1200x630 kart) dosya kuralı gereği hem
  // OG hem Twitter kartı için otomatik kullanılıyor. Önceden burada
  // gerçek bir müşterinin adının ve şikayet metninin göründüğü, üstelik
  // artık kullanılmayan eski panel tasarımını gösteren statik bir ekran
  // görüntüsü sabitti — biri bu linki Twitter'da paylaşsaydı canlı bir
  // müşterinin verisini kartta görürdü.
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "/",
    siteName: SITE_ADI,
    title: `${SITE_ADI} — QR ile Müşteri Memnuniyet Sistemi`,
    description: SITE_ACIKLAMA,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_ADI} — QR ile Müşteri Memnuniyet Sistemi`,
    description: SITE_ACIKLAMA,
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
      <body className="min-h-full bg-canvas text-ink">
        {/* Klavyeyle gezen kullanıcı her sayfada önce menüyü sekmelemek
            zorunda kalmasın: ilk Tab bu bağlantıyı görünür yapıyor. */}
        <a
          href="#icerik"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-control focus:bg-accent-600 focus:px-4 focus:py-2 focus:text-small focus:font-medium focus:text-white"
        >
          İçeriğe geç
        </a>
        {children}
      </body>
    </html>
  );
}
