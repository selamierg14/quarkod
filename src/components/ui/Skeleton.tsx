/**
 * Yükleme iskeleti. Dönen çark yerine gelecek içeriğin şeklini gösteriyoruz:
 * sayfa yerleşmeden kullanıcı nereye bakacağını biliyor.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`mm-skeleton block rounded-chip bg-sunken ring-1 ring-line ${className}`}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-card bg-surface p-4 shadow-card ring-1 ring-line">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-7 w-16" />
      <Skeleton className="mt-2 h-2.5 w-32" />
    </div>
  );
}

export function SkeletonRows({ satir = 5 }: { satir?: number }) {
  return (
    <div className="divide-y divide-line" role="status" aria-label="Yükleniyor">
      {Array.from({ length: satir }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-3.5 w-16" />
        </div>
      ))}
    </div>
  );
}
