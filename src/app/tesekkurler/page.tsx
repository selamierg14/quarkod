import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { markaStili } from "@/lib/marka";
import { DENEME_GUN } from "@/lib/deneme";
import { Footer } from "../_landing/Footer";
import { Header } from "../_landing/Header";

/**
 * Kayıt sonrası teşekkür sayfası.
 *
 * Önceden kayıt biter bitmez doğrudan panele atılıyordu: kullanıcı ne olduğunu
 * anlamadan boş bir panelde buluyordu kendini ve dönüşümü ölçecek ayrı bir
 * adres de yoktu. Burası hem "kaydın tamam" diyor, hem ilk üç adımı
 * gösteriyor, hem de reklam tarafında hedef sayfa olarak kullanılabiliyor.
 *
 * Arama motoruna kapalı: dışarıdan girilmesi anlamsız bir ara sayfa.
 */
export const metadata: Metadata = {
  title: "Hesabınız hazır",
  description: "Deneme hesabınız açıldı. İlk QR kodunuzu oluşturarak başlayın.",
  robots: { index: false, follow: false },
};

const MARKA_RENGI = "#4f46e5";

const ADIMLAR = [
  {
    baslik: "QR kodunuzu oluşturun",
    metin: "Masalarınıza özel kod ya da tüm mekân için tek ortak kod — ikisi de birkaç saniye.",
    href: "/admin/isletmeler",
    dugme: "Masalar & QR",
  },
  {
    baslik: "Menünüzü kurun",
    metin: "Sektörünüze uygun hazır bir şablon seçin, fiyatları kendinize göre düzenleyin.",
    href: "/admin/menu/sablonlar",
    dugme: "Hazır şablonlar",
  },
  {
    baslik: "İlk geri bildirimi izleyin",
    metin: "Kodu kendiniz okutup deneyin; puan panele düştüğü an Özet ekranında görürsünüz.",
    href: "/admin",
    dugme: "Panele git",
  },
];

export default function TesekkurlerPage() {
  return (
    <main data-marka style={markaStili(MARKA_RENGI)} className="min-h-dvh bg-canvas">
      <Header />

      <section className="mx-auto max-w-3xl px-5 py-14">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-success text-white"
          >
            <Check className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-display font-semibold tracking-tight text-ink">
              Hesabınız hazır
            </h1>
            <p className="text-body text-ink-soft">
              {DENEME_GUN} günlük denemeniz başladı — kredi kartı istemedik.
            </p>
          </div>
        </div>

        <p className="mt-6 text-body leading-relaxed text-ink-soft">
          Sırada üç kısa adım var. Hepsi birkaç dakika sürüyor ve sonunda
          masaya koyabileceğiniz gerçek bir QR kodunuz oluyor.
        </p>

        <ol className="mt-8 flex flex-col gap-3">
          {ADIMLAR.map((adim, i) => (
            <li
              key={adim.baslik}
              className="flex flex-wrap items-center gap-4 rounded-card bg-surface p-5 shadow-card ring-1 ring-line"
            >
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-small font-bold text-brand-ink"
              >
                {i + 1}
              </span>
              <div className="min-w-[14rem] flex-1">
                <p className="font-semibold text-ink">{adim.baslik}</p>
                <p className="mt-0.5 text-small text-ink-muted">{adim.metin}</p>
              </div>
              <Link
                href={adim.href}
                className="inline-flex items-center gap-1.5 rounded-control border border-line bg-surface px-4 py-2 text-small font-medium text-ink-soft transition hover:bg-canvas"
              >
                {adim.dugme}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-control bg-brand px-5 py-3 text-small font-semibold text-brand-ink shadow-card"
          >
            Panele git
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/vaka-calismalari"
            className="text-small font-medium text-ink-muted underline underline-offset-2 hover:text-ink"
          >
            Başkaları nasıl kullanıyor?
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
