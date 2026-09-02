"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Map, Wallet, User } from "lucide-react";

const SEKMELER = [
  { href: "/kesfet", label: "Keşfet", ikon: Compass },
  { href: "/harita", label: "Harita", ikon: Map },
  { href: "/cuzdan", label: "Cüzdan", ikon: Wallet },
  { href: "/profil", label: "Profil", ikon: User },
] as const;

/**
 * Sabit alt gezinme çubuğu.
 *
 * `mekan/[slug]` bilerek burada yok: o bir sekme değil, Keşfet'ten ya da
 * Harita'dan açılan bir DETAY sayfası — alt menüde ayrı bir sekmesi olsaydı
 * "buradan nasıl çıkarım" hissi verirdi, oysa geri okla ya da sekmeye
 * tekrar dokunarak zaten dönülüyor.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Ana menü"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-slate-800 bg-slate-900/85 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex items-stretch justify-around">
        {SEKMELER.map(({ href, label, ikon: Ikon }) => {
          const aktif = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={aktif ? "page" : undefined}
              className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition"
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
                  aktif ? "bg-[#6366F1]/20 text-[#818CF8]" : "text-slate-500"
                }`}
              >
                <Ikon className="h-5 w-5" strokeWidth={aktif ? 2.4 : 1.8} aria-hidden="true" />
              </span>
              <span className={aktif ? "text-white" : "text-slate-500"}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
