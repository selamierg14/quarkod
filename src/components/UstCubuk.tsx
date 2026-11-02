"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { konumYolu, type NavGrup } from "@/lib/kimlik/panel";
import { BildirimZili } from "./BildirimZili";
import { komutPaletiniAc } from "./KomutPaleti";

/**
 * Masaüstü üst çubuğu — zeminden ayrılmış, yüzen bir kart.
 *
 * Solda geniş arama (Ctrl/⌘ K paletini açar), sağda bildirimler ve
 * kullanıcı rozeti (ad + rol). Konum yolu burada değil, sayfa
 * başlığının hemen üstünde (bkz. KonumYolu): kullanıcı nerede olduğunu
 * başlığı okurken görüyor.
 */
export function UstCubuk({ ad, rolAdi }: { ad: string; rolAdi: string }) {
  const mac = useMacMi();
  const basHarf = ad.trim().charAt(0).toLocaleUpperCase("tr");

  return (
    <div className="print-hidden hidden items-center gap-3 rounded-card bg-surface px-3 py-2.5 shadow-card ring-1 ring-line lg:flex">
      <button
        type="button"
        onClick={komutPaletiniAc}
        className="flex h-10 w-full max-w-md items-center gap-2.5 rounded-control px-3 text-small text-ink-faint ring-1 ring-line transition hover:ring-line-strong"
      >
        <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="flex-1 text-left">Sayfa ya da ekran ara</span>
        <kbd className="rounded-md bg-sunken px-1.5 py-0.5 font-sans text-[11px] text-ink-faint">
          {mac ? "⌘K" : "Ctrl K"}
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <BildirimZili />
        <Link
          href="/admin/profil"
          className="flex items-center gap-2.5 rounded-control py-1 pr-2 pl-1 ring-1 ring-line transition hover:bg-sunken"
        >
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-kabuk text-caption font-semibold text-white"
          >
            {basHarf}
          </span>
          <span className="flex max-w-44 flex-col leading-tight">
            <span className="truncate text-small font-semibold text-ink">{ad}</span>
            <span className="truncate text-[11px] text-ink-faint">{rolAdi}</span>
          </span>
          <ChevronDown className="h-4 w-4 text-ink-faint" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

/**
 * Sayfa başlığının üstündeki konum yolu: "Platform › Kullanıcılar › Yeni".
 * Menü ağacından türüyor (bkz. lib/kimlik/panel.ts — konumYolu).
 */
export function KonumYolu({ gruplar }: { gruplar: NavGrup[] }) {
  const pathname = usePathname();
  const yol = konumYolu(gruplar, pathname);
  if (yol.length === 0) return null;

  return (
    <nav aria-label="Konum" className="print-hidden">
      <ol className="flex min-w-0 flex-wrap items-center gap-1 text-small">
        {yol.map((adim, i) => (
          <li key={`${adim.label}-${i}`} className="flex min-w-0 items-center gap-1">
            {i > 0 ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden="true" /> : null}
            {adim.href ? (
              <Link href={adim.href} className="truncate text-ink-faint hover:text-ink">
                {adim.label}
              </Link>
            ) : (
              <span
                className={`truncate ${i === yol.length - 1 ? "text-ink-muted" : "text-ink-faint"}`}
                aria-current={i === yol.length - 1 ? "page" : undefined}
              >
                {adim.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

const aboneOlma = () => () => {};

/** Kısayol etiketi işletim sistemine göre: Mac'te ⌘K, diğerlerinde Ctrl K. */
function useMacMi(): boolean {
  return useSyncExternalStore(
    aboneOlma,
    () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent),
    () => false,
  );
}
