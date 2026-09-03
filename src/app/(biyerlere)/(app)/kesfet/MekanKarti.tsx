import Link from "next/link";
import { Star, MapPin } from "lucide-react";
import type { MekanOzet } from "@/lib/kesfet-veri";
import { Skeleton } from "../../components/Skeleton";

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
      className="block overflow-hidden rounded-2xl border border-white/10 bg-[#24262E]/85 backdrop-blur-md transition active:scale-[0.97] duration-150 ease-out"
    >
      <div className="relative h-36 w-full bg-white/5">
        {mekan.kapakUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mekan.kapakUrl} alt="" className="h-full w-full object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-[#18191E]/90 via-transparent to-transparent" />

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
              <p className="flex items-center gap-1 truncate text-[11px] text-gray-300">
                <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                {mekan.adres}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-3.5 py-2.5">
        <div className="flex items-center gap-3 text-[13px] text-gray-300">
          {mekan.puan !== null ? (
            <span className="flex items-center gap-1 font-semibold text-white">
              <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" aria-hidden="true" />
              {mekan.puan.toFixed(1)}
            </span>
          ) : (
            <span className="text-gray-400">Henüz puan yok</span>
          )}
          {mekan.fiyatSegmenti ? (
            <span className="text-gray-400">
              {mekan.fiyatSegmenti === "ucuz" ? "₺" : mekan.fiyatSegmenti === "orta" ? "₺₺" : "₺₺₺"}
            </span>
          ) : null}
        </div>
        {mesafe ? <span className="text-[12px] font-medium text-gray-400">{mesafe}</span> : null}
      </div>
    </Link>
  );
}

/** `MekanKarti` ile aynı hatlar — liste henüz gelmemişken yerini tutuyor. */
export function MekanKartiSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#24262E]/85">
      <Skeleton className="h-36 w-full rounded-none" />
      <div className="flex items-center justify-between px-3.5 py-2.5">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-10" />
      </div>
    </div>
  );
}
