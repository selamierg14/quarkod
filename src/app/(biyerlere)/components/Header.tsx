"use client";

import Link from "next/link";
import { MapPin, Search, Bell } from "lucide-react";
import { useOturum } from "../lib/OturumSaglayici";
import { useKonum } from "../lib/konum";

/**
 * Üst başlık: solda konum, sağda arama + bildirim.
 *
 * Bildirim zili GERÇEK bir bildirim akışına bağlı değil — Biyerlere'de
 * henüz öyle bir tablo/kanal yok (panelin bildirim ziliyle karıştırmayın,
 * o tamamen ayrı bir sistem, bkz. src/lib/bildirim.ts). Sahte bir "3 yeni
 * bildirim" rozeti göstermek yerine, elimizde zaten olan gerçek bir
 * sinyali kullanıyoruz: cüzdanındaki kullanılmamış kupon sayısı. Böylece
 * zil "unutma, elinde X kuponun var" gibi dürüst bir işe yarıyor.
 */
export function Header() {
  const { oturum } = useOturum();
  const { durum, konumIste } = useKonum();

  const kuponSayisi = oturum.durum === "girisli" ? oturum.kullanici.cuzdandakiKupon : 0;

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-slate-800 bg-[#0F172A]/90 px-4 py-3 backdrop-blur-md">
      <button
        type="button"
        onClick={konumIste}
        className="flex min-w-0 items-center gap-1.5 text-small font-medium text-white"
      >
        <MapPin className="h-4 w-4 shrink-0 text-[#818CF8]" aria-hidden="true" />
        <span className="truncate">
          {durum === "verildi"
            ? "Yakınımda"
            : durum === "isteniyor"
              ? "Konum alınıyor…"
              : "Konumu aç"}
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-1">
        <Link
          href="/kesfet"
          aria-label="Mekan ara"
          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/5"
        >
          <Search className="h-[18px] w-[18px]" aria-hidden="true" />
        </Link>
        <Link
          href="/cuzdan"
          aria-label="Cüzdanım"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/5"
        >
          <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
          {kuponSayisi ? (
            <span
              aria-hidden="true"
              className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF5A36] px-1 text-[10px] font-semibold text-white"
            >
              {kuponSayisi > 9 ? "9+" : kuponSayisi}
            </span>
          ) : null}
        </Link>
      </div>
    </header>
  );
}
