"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProfilAvatarButton } from "./ProfilAvatarButton";
import { APP_VERSION } from "@/lib/constants";
import { logout } from "@/app/admin/giris/actions";

type PersonelLink = { href: string; label: string; ikon: "takvim" | "gorev" };

const LINKLER: PersonelLink[] = [
  { href: "/admin/vardiyalarim", label: "Vardiyalarım", ikon: "takvim" },
  { href: "/admin/gorevlerim", label: "Görevlerim", ikon: "gorev" },
];

/**
 * Garson (saha personeli) için ayrı, sade kabuk.
 *
 * Yönetici sidebar'ı burada gereksiz: bu rol yalnızca iki ekran görüyor ve
 * büyük ihtimalle telefonundan, vardiyanın ortasında bakıyor. Alttaki sabit
 * iki sekme, hamburger menüden çok daha az sürtünmeli — bir uygulama gibi
 * hissettirsin diye.
 */
export function PersonelKabuk({
  ad,
  children,
}: {
  ad: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="print-hidden sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-line bg-surface px-4 py-2.5">
        <span className="font-semibold tracking-tight text-ink">Memnuniyet Paneli</span>
        <div className="flex items-center gap-2">
          <span className="hidden text-caption text-ink-faint sm:inline">v{APP_VERSION}</span>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-chip border border-line px-2.5 py-1 text-caption text-ink-soft hover:bg-canvas"
            >
              Çıkış
            </button>
          </form>
          <ProfilAvatarButton ad={ad} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-5 pb-24">{children}</main>

      <nav
        aria-label="Personel menüsü"
        className="print-hidden fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto flex max-w-2xl">
          {LINKLER.map((link) => {
            const aktif = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={aktif ? "page" : undefined}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-caption font-medium transition ${
                  aktif ? "text-ink" : "text-ink-faint hover:text-ink-soft"
                }`}
              >
                <SekmeIkonu ad={link.ikon} aktif={aktif} />
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function SekmeIkonu({ ad, aktif }: { ad: "takvim" | "gorev"; aktif: boolean }) {
  const ortak = "h-5 w-5";
  const p = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: aktif ? 2.2 : 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (ad === "takvim") {
    return (
      <svg viewBox="0 0 24 24" className={ortak} {...p}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={ortak} {...p}>
      <path d="M9 11l2 2 4-4" />
      <rect x="3" y="4" width="18" height="17" rx="2" />
    </svg>
  );
}
