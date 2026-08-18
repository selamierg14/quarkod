import Link from "next/link";
import { Menu, QrCode } from "lucide-react";
import { ButtonLink } from "@/components/ui";

const NAV_LINKS = [
  { href: "#ozellikler", label: "Özellikler" },
  { href: "#nasil-calisir", label: "Nasıl Çalışır" },
  { href: "#paketler", label: "Paketler" },
  { href: "#sss", label: "SSS" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/80 backdrop-blur-md">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2 font-semibold text-ink">
          <span className="flex h-8 w-8 items-center justify-center rounded-control bg-brand text-brand-ink shadow-card">
            <QrCode className="h-4 w-4" aria-hidden="true" />
          </span>
          Memnuniyet Paneli
        </Link>

        <nav className="hidden items-center gap-6 text-small font-medium text-ink-soft md:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="transition-colors hover:text-ink">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/admin/giris" className="text-small font-medium text-ink-soft hover:text-ink">
            Giriş Yap
          </Link>
          <ButtonLink href="/deneme" size="sm" variant="brand">
            7 gün ücretsiz dene
          </ButtonLink>
        </div>

        <details className="md:hidden">
          <summary className="flex h-9 w-9 list-none items-center justify-center rounded-control ring-1 ring-line [&::-webkit-details-marker]:hidden">
            <Menu className="h-5 w-5" aria-hidden="true" />
          </summary>
          <div className="absolute inset-x-0 top-16 border-b border-line bg-surface px-5 py-5 shadow-raised">
            <nav className="flex flex-col gap-4 text-body font-medium text-ink-soft">
              {NAV_LINKS.map((l) => (
                <a key={l.href} href={l.href} className="hover:text-ink">
                  {l.label}
                </a>
              ))}
              <Link href="/admin/giris" className="hover:text-ink">
                Giriş Yap
              </Link>
              <ButtonLink href="/deneme" block variant="brand">
                7 gün ücretsiz dene
              </ButtonLink>
            </nav>
          </div>
        </details>
      </div>
    </header>
  );
}
