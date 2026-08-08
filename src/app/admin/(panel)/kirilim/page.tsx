import Link from "next/link";
import { requireUser, visibleBusinesses } from "@/lib/auth";
import { getShiftBreakdown, getTableBreakdown } from "@/lib/stats";
import { EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "Kırılım" };

const PERIODS = [
  { days: 7, label: "Son 7 gün" },
  { days: 30, label: "Son 30 gün" },
  { days: 90, label: "Son 90 gün" },
];

/** Ortalamaya göre renk: 3'ün altı kırmızı, 4'ün altı sarı. */
function toneFor(average: number | null): string {
  if (average === null) return "bg-slate-200";
  if (average < 3) return "bg-red-500";
  if (average < 4) return "bg-amber-400";
  return "bg-emerald-500";
}

export default async function BreakdownPage({
  searchParams,
}: {
  searchParams: Promise<{ isletme?: string; gun?: string }>;
}) {
  const user = await requireUser();
  const businesses = await visibleBusinesses(user);
  const allowedIds = businesses.map((b) => b.id);
  const query = await searchParams;

  const selected =
    query.isletme && allowedIds.includes(query.isletme)
      ? [query.isletme]
      : allowedIds;
  const days = PERIODS.some((p) => String(p.days) === query.gun)
    ? Number(query.gun)
    : 30;

  const [shifts, tables] = await Promise.all([
    getShiftBreakdown(selected, days),
    getTableBreakdown(selected, days),
  ]);

  const shiftTotal = shifts.reduce((acc, row) => acc + row.count, 0);

  function href(next: { isletme?: string; gun?: number }) {
    const params = new URLSearchParams();
    const isletme = next.isletme ?? (query.isletme && allowedIds.includes(query.isletme) ? query.isletme : "");
    if (isletme) params.set("isletme", isletme);
    params.set("gun", String(next.gun ?? days));
    return `/admin/kirilim?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Kırılım</h1>
        <p className="mt-1 text-sm text-slate-500">
          Aynı ortalama, farklı yerlerde farklı sebeplerden düşer. Vardiya
          personel sorununu, masa ise mekânla ilgili sorunu (gürültü, ısı,
          servise uzaklık) ele verir.
        </p>
      </div>

      <div className="print-hidden flex flex-wrap gap-2">
        {businesses.length > 1 ? (
          <div className="flex flex-wrap gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200">
            <Link
              href={href({ isletme: "" })}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                !query.isletme ? "bg-slate-900 text-white" : "text-slate-600"
              }`}
            >
              Hepsi
            </Link>
            {businesses.map((business) => (
              <Link
                key={business.id}
                href={href({ isletme: business.id })}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  query.isletme === business.id
                    ? "bg-slate-900 text-white"
                    : "text-slate-600"
                }`}
              >
                {business.name}
              </Link>
            ))}
          </div>
        ) : null}

        <div className="flex gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200">
          {PERIODS.map((period) => (
            <Link
              key={period.days}
              href={href({ gun: period.days })}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                days === period.days ? "bg-slate-900 text-white" : "text-slate-600"
              }`}
            >
              {period.label}
            </Link>
          ))}
        </div>
      </div>

      <section className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
        <h2 className="text-xs font-medium tracking-wide text-slate-500 uppercase">
          Vardiyaya göre
        </h2>
        {shiftTotal === 0 ? (
          <p className="mt-3 text-sm text-slate-400">
            Bu dönemde vardiya etiketli geri bildirim yok.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {shifts.map((row) => (
              <li key={row.shift}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">{row.label}</span>
                  <span className="tabular-nums text-slate-500">
                    {row.average !== null ? `${row.average.toFixed(2)} / 5` : "—"}
                    <span className="ml-2 text-slate-400">{row.count} kayıt</span>
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${toneFor(row.average)}`}
                    style={{ width: `${((row.average ?? 0) / 5) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
        <h2 className="text-xs font-medium tracking-wide text-slate-500 uppercase">
          Masaya göre — en düşükten başlayarak
        </h2>
        {tables.length === 0 ? (
          <EmptyState>Bu dönemde masa etiketli geri bildirim yok.</EmptyState>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead className="border-b border-slate-200 text-left text-xs tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="py-2 font-medium">Masa</th>
                  <th className="py-2 font-medium">Ortalama</th>
                  <th className="py-2 font-medium">Kayıt</th>
                  <th className="w-1/3 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tables.map((row) => (
                  <tr key={row.tableId}>
                    <td className="py-2.5 font-medium">{row.label}</td>
                    <td className="py-2.5 tabular-nums text-slate-600">
                      {row.average !== null ? row.average.toFixed(2) : "—"}
                    </td>
                    <td className="py-2.5 tabular-nums text-slate-400">{row.count}</td>
                    <td className="py-2.5">
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${toneFor(row.average)}`}
                          style={{ width: `${((row.average ?? 0) / 5) * 100}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-slate-400">
              Az kayıtlı masaların ortalaması yanıltıcı olabilir — kayıt sayısına
              da bakın.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
