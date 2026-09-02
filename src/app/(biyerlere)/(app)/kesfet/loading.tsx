import { Skeleton } from "../../components/Skeleton";
import { MekanKartiSkeleton } from "./MekanKarti";

/**
 * Keşfet `force-dynamic` bir Server Component — her ziyarette sunucuda
 * yeniden sorgulanıyor (bkz. page.tsx'teki yorum). Sayfanın kendisi hâlâ
 * "ilk boyama gerçek veriyle olsun" ilkesine sadık kalıyor; bu dosya o
 * veri gelene kadarki BEKLEME anını dolduruyor, onun yerine geçmiyor.
 */
export default function KesfetYukleniyor() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1 rounded-control" />
        <Skeleton className="h-10 w-24 rounded-control" />
      </div>
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div>
        <Skeleton className="h-5 w-40" />
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <MekanKartiSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
