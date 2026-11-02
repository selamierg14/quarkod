"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { ChevronRight, Search } from "lucide-react";
import { konumYolu, type NavGrup } from "@/lib/kimlik/panel";
import { BildirimZili } from "./BildirimZili";
import { ProfilAvatarButton } from "./ProfilAvatarButton";
import { komutPaletiniAc } from "./KomutPaleti";

/**
 * Masaüstü üst çubuğu.
 *
 * Önceden 55px yüksekliğinde ve içinde yalnızca zil ile avatar vardı —
 * UI incelemesi "boş beyaz şerit" dedi. Artık iki işi var:
 *
 *   - SOLDA konum yolu: "Platform › Kullanıcılar › Yeni". Alt sayfalarda
 *     (ekle/düzenle/detay) nerede olduğunu ve bir üste nasıl döneceğini
 *     söylüyor.
 *   - SAĞDA arama: Ctrl/⌘ K paleti zaten vardı ama yalnızca klavye
 *     kısayolunu bilen buluyordu; görünür bir düğme olmadığı için
 *     inceleme "global arama yok" diye raporladı.
 */
export function UstCubuk({ gruplar, ad }: { gruplar: NavGrup[]; ad: string }) {
  const pathname = usePathname();
  const yol = konumYolu(gruplar, pathname);
  const mac = useMacMi();

  return (
    <div className="print-hidden hidden items-center gap-3 border-b border-line bg-surface px-4 py-2 lg:flex lg:px-6">
      <nav aria-label="Konum" className="min-w-0 flex-1">
        <ol className="flex min-w-0 items-center gap-1 text-small">
          {yol.map((adim, i) => (
            <li key={`${adim.label}-${i}`} className="flex min-w-0 items-center gap-1">
              {i > 0 ? (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
              ) : null}
              {adim.href ? (
                <Link href={adim.href} className="truncate text-ink-muted hover:text-ink">
                  {adim.label}
                </Link>
              ) : (
                <span
                  className={`truncate ${
                    i === yol.length - 1 ? "font-medium text-ink" : "text-ink-faint"
                  }`}
                  aria-current={i === yol.length - 1 ? "page" : undefined}
                >
                  {adim.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <button
        type="button"
        onClick={komutPaletiniAc}
        className="flex h-8 w-56 items-center gap-2 rounded-control border border-line bg-canvas px-2.5 text-small text-ink-faint transition hover:border-line-strong hover:text-ink-muted"
      >
        <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="flex-1 text-left">Sayfa ara…</span>
        <kbd className="rounded border border-line bg-surface px-1.5 font-sans text-[11px]">
          {mac ? "⌘K" : "Ctrl K"}
        </kbd>
      </button>

      <div className="flex items-center gap-1.5">
        <BildirimZili />
        <ProfilAvatarButton ad={ad} />
      </div>
    </div>
  );
}

const aboneOlma = () => () => {};

/**
 * Kısayol etiketi işletim sistemine göre: Mac'te ⌘K, diğerlerinde Ctrl K.
 * Sunucuda platform bilinmediği için ilk çizim "Ctrl K"; hidrasyon
 * uyuşmazlığı olmadan istemcide düzeliyor.
 */
function useMacMi(): boolean {
  return useSyncExternalStore(
    aboneOlma,
    () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent),
    () => false,
  );
}
