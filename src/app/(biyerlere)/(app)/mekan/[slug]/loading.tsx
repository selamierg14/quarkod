import { Skeleton } from "../../../components/Skeleton";

/** `/mekan/[slug]` de bir Server Component — bkz. etkinlikler/loading.tsx. */
export default function MekanYukleniyor() {
  return (
    <div className="-mx-4 -mt-3 flex flex-col gap-5 pb-4">
      <Skeleton className="h-56 w-full rounded-none" />
      <div className="flex flex-col gap-5 px-4">
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    </div>
  );
}
