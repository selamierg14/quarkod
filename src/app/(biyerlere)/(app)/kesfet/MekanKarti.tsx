import Link from "next/link";
import { Star, MapPin } from "lucide-react";
import type { MekanOzet } from "@/lib/kesfet-veri";

/** Kategori özelliklerinin rozet rengi — spec'teki sabit palet. */
const OZELLIK_RENGI: Record<string, string> = {
  canliMuzik: "#EC4899",
  nargile: "#8B5CF6",
  macYayini: "#3B82F6",
};

function mesafeYaz(metre: number | null): string | null {
  if (metre === null) return null;
  if (metre < 1000) return `${metre} m`;
  return `${(metre / 1000).toFixed(1)} km`;
}

export function MekanKarti({ mekan }: { mekan: MekanOzet }) {
  const oneCikanOzellik = mekan.ozellikler.find((o) => o in OZELLIK_RENGI);
  const mesafe = mesafeYaz(mekan.mesafeMetre);

  return (
    <Link
      href={`/mekan/${mekan.slug}`}
      className="block overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/85 backdrop-blur-md transition active:scale-[0.99]"
    >
      <div className="relative h-36 w-full bg-slate-800">
        {mekan.kapakUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mekan.kapakUrl} alt="" className="h-full w-full object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

        {oneCikanOzellik ? (
          <span
            className="absolute top-2.5 left-2.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white shadow"
            style={{ backgroundColor: OZELLIK_RENGI[oneCikanOzellik] }}
          >
            {oneCikanOzellik === "canliMuzik"
              ? "🎸 Canlı Müzik"
              : oneCikanOzellik === "nargile"
                ? "💨 Lounge"
                : "⚽ Maç Yayını"}
          </span>
        ) : null}

        {mekan.etkinlikler.length > 0 ? (
          <span className="absolute top-2.5 right-2.5 rounded-full bg-[#10B981] px-2.5 py-1 text-[11px] font-semibold text-white shadow">
            🔥 Bu hafta etkinlik var
          </span>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-white">{mekan.ad}</h3>
            {mekan.adres ? (
              <p className="flex items-center gap-1 truncate text-[11px] text-slate-300">
                <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                {mekan.adres}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-3.5 py-2.5">
        <div className="flex items-center gap-3 text-[13px] text-slate-300">
          {mekan.puan !== null ? (
            <span className="flex items-center gap-1 font-semibold text-white">
              <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" aria-hidden="true" />
              {mekan.puan.toFixed(1)}
            </span>
          ) : (
            <span className="text-slate-500">Henüz puan yok</span>
          )}
          {mekan.fiyatSegmenti ? (
            <span className="text-slate-400">
              {mekan.fiyatSegmenti === "ucuz" ? "₺" : mekan.fiyatSegmenti === "orta" ? "₺₺" : "₺₺₺"}
            </span>
          ) : null}
        </div>
        {mesafe ? <span className="text-[12px] font-medium text-slate-400">{mesafe}</span> : null}
      </div>
    </Link>
  );
}
