import Link from "next/link";
import { ArrowRight, Home } from "lucide-react";
import { markaStili } from "@/lib/marka";

/**
 * 404 sayfası.
 *
 * Eskiden tek bir "Panele dön" düğmesi vardı: siteye arama motorundan gelip
 * yanlış adrese düşen bir ziyaretçi için anlamsız, çünkü paneli yok. Artık
 * hem site içindeki gerçek sayfalara yönlendiriyor (iç linkleme) hem de
 * paneli olanlar için giriş bağlantısını koruyor.
 */
export const metadata = {
  title: "Sayfa bulunamadı",
  robots: { index: false, follow: true },
};

const MARKA_RENGI = "#4f46e5";

const YOLLAR = [
  { href: "/", ad: "Ana sayfa", not: "Ürünün ne yaptığı, paketler ve SSS" },
  { href: "/vaka-calismalari", ad: "Vaka çalışmaları", not: "İşletmeler hangi sorunu nasıl çözdü" },
  { href: "/deneme", ad: "7 gün ücretsiz deneme", not: "Kredi kartı istemiyoruz" },
  { href: "/admin/giris", ad: "Panele giriş", not: "Hesabınız varsa buradan girin" },
];

export default function NotFound() {
  return (
    <main
      data-marka
      style={markaStili(MARKA_RENGI)}
      className="flex min-h-dvh items-center justify-center bg-canvas px-5 py-16"
    >
      <div className="w-full max-w-lg">
        <p className="text-caption font-semibold tracking-wide text-brand uppercase">
          404 — Sayfa bulunamadı
        </p>
        <h1 className="mt-2 text-display font-semibold tracking-tight text-ink">
          Aradığınız sayfa burada değil
        </h1>
        <p className="mt-3 text-body text-ink-soft">
          Bağlantı eski olabilir ya da adres yanlış yazılmış olabilir. Aşağıdan
          devam edebilirsiniz.
        </p>

        <ul className="mt-8 flex flex-col gap-2">
          {YOLLAR.map((yol) => (
            <li key={yol.href}>
              <Link
                href={yol.href}
                className="group flex items-center gap-3 rounded-card bg-surface p-4 shadow-card ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-raised"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-small font-semibold text-ink">{yol.ad}</span>
                  <span className="block text-caption text-ink-muted">{yol.not}</span>
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-brand"
                />
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 text-small font-medium text-ink-muted hover:text-ink"
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          Ana sayfaya dön
        </Link>
      </div>
    </main>
  );
}
