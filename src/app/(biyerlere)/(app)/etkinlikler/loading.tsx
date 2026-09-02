import { Skeleton } from "../../components/Skeleton";

/**
 * `/etkinlikler` bir Server Component: veri gelene kadar Next.js bu
 * dosyayı otomatik gösterir (bkz. loading.js dosya kuralı). Sayfanın
 * kendi "Yükleniyor…" durumu yok, o yüzden iskelet burada.
 */
export default function EtkinliklerYukleniyor() {
  return (
    <div>
      <Skeleton className="h-6 w-40" />
      <Skeleton className="mt-2 h-4 w-64" />
      <div className="mt-5 flex flex-col gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex gap-3 rounded-2xl border border-slate-800 bg-slate-900/85 p-3.5">
            <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
            <div className="flex-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-4 w-40" />
              <Skeleton className="mt-2 h-3 w-28" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
