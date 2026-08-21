import type { Metadata } from "next";
import { markaStili } from "@/lib/marka";
import { AnnouncementBar } from "./_landing/AnnouncementBar";
import { BusinessTypes } from "./_landing/BusinessTypes";
import { Faq, SORULAR } from "./_landing/Faq";
import { FinalCta } from "./_landing/FinalCta";
import { Footer } from "./_landing/Footer";
import { Header } from "./_landing/Header";
import { Hero } from "./_landing/Hero";
import { HowItWorks } from "./_landing/HowItWorks";
import { PanelPreview } from "./_landing/PanelPreview";
import { Pricing } from "./_landing/Pricing";
import { QrAnketShowcase } from "./_landing/QrAnketShowcase";
import { QrMenuShowcase } from "./_landing/QrMenuShowcase";
import { TrustBar } from "./_landing/TrustBar";
import { StickyCta } from "./_landing/StickyCta";
import { YapisalVeri } from "./_landing/YapisalVeri";

export const metadata: Metadata = {
  // Ana sayfa layout'taki şablonu kullanmıyor: burada marka adı zaten
  // başlığın içinde ve "%s · Quarkod" tekrarı olurdu.
  title: {
    absolute: "Quarkod — QR ile Müşteri Memnuniyet Sistemi | 7 Gün Ücretsiz",
  },
  description:
    "Masaya koyduğunuz QR kod ile müşteri memnuniyetini ölçün, düşük puanı anında haber alın, yüksek puanı Google yorumuna yönlendirin. 7 gün ücretsiz deneyin.",
  alternates: { canonical: "/" },
};

/** Pazarlama sitesinin kendi ürün rengi: panelin nötr mürekkebinden ayrı, canlı bir kimlik. */
const MARKA_RENGI = "#4f46e5";

export default function HomePage() {
  return (
    <main
      data-marka
      style={markaStili(MARKA_RENGI)}
      className="min-h-dvh bg-canvas pb-24 lg:pb-0"
      id="icerik"
    >
      <YapisalVeri sorular={SORULAR} />
      <AnnouncementBar />
      <Header />
      <Hero />
      <TrustBar />
      <BusinessTypes />
      <QrAnketShowcase />
      <QrMenuShowcase />
      <HowItWorks />
      <PanelPreview />
      <Pricing />
      <Faq />
      <FinalCta />
      <Footer />
      <StickyCta />
    </main>
  );
}
