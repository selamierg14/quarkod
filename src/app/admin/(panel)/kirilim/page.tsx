import { requireAnketErisim, visibleBusinesses } from "@/lib/auth";
import { getDoldurmaSuresi, getShiftBreakdown, getTableBreakdown } from "@/lib/stats";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/ui";
import { RaporSekmeleri } from "@/components/RaporSekmeleri";
import { PeriyotFiltre } from "@/components/PeriyotFiltre";
import { gunEkle, gunBaslangici } from "@/lib/gun";

export const dynamic = "force-dynamic";

export const metadata = { title: "Vardiya & masa" };

const PERIODS = [
  { days: 7, label: "Son 7 gün" },
  { days: 30, label: "Son 30 gün" },
  { days: 90, label: "Son 90 gün" },
];

/** Ortalamaya göre renk: 3'ün altı kırmızı, 4'ün altı sarı. */
function toneFor(average: number | null): string {
  if (average === null) return "bg-slate-200";
  if (average < 3) return "bg-danger";
  if (average < 4) return "bg-rating";
  return "bg-success";
}

export default async function BreakdownPage({
  searchParams,
}: {
  searchParams: Promise<{ isletme?: string; gun?: string }>;
}) {
  const user = await requireAnketErisim();
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

  const [shifts, tables, doldurmaSuresi, atamalar] = await Promise.all([
    getShiftBreakdown(selected, days),
    getTableBreakdown(selected, days),
    getDoldurmaSuresi(selected, days),
    // "Akşam vardiyasında puan neden düşük" sorusuna cevap vermek için:
    // o dönemde vardiyaya kimin atandığını da yanına yazıyoruz. Bu bir
    // istatistik değil, yöneticinin gözle karşılaştırması için ipucu.
    prisma.shiftAssignment.findMany({
      where: {
        businessId: { in: selected },
        date: { gte: gunBaslangici(gunEkle(new Date(), -days)) },
      },
      distinct: ["userId", "shift"],
      include: { user: { select: { name: true } } },
    }),
  ]);

  const shiftTotal = shifts.reduce((acc, row) => acc + row.count, 0);
  const personelByShift = new Map<string, string[]>();
  for (const atama of atamalar) {
    const liste = personelByShift.get(atama.shift) ?? [];
    if (!liste.includes(atama.user.name)) liste.push(atama.user.name);
    personelByShift.set(atama.shift, liste);
  }

  return (
    <div className="flex flex-col gap-5">
      <RaporSekmeleri aktif="vardiya" />

      <div>
        <h1 className="text-title font-semibold">Vardiya &amp; masa</h1>
        <p className="mt-1 text-small text-ink-muted">
          Aynı ortalama, farklı yerlerde farklı sebeplerden düşer. Vardiya
          personel sorununu, masa ise mekânla ilgili sorunu (gürültü, ısı,
          servise uzaklık) ele verir.
        </p>
        {doldurmaSuresi ? (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-chip bg-sunken px-3 py-1.5 text-caption text-ink-soft">
            <span aria-hidden="true">⏱</span>
            Ortalama doldurma süresi:{" "}
            <span className="font-medium text-ink">
              {doldurmaSuresi.ortalamaSaniye < 60
                ? `${Math.round(doldurmaSuresi.ortalamaSaniye)} sn`
                : `${(doldurmaSuresi.ortalamaSaniye / 60).toFixed(1)} dk`}
            </span>
            <span className="text-ink-faint">({doldurmaSuresi.adet} kayıt)</span>
          </p>
        ) : null}
      </div>

      <PeriyotFiltre
        baseHref="/admin/kirilim"
        businesses={businesses}
        donemler={PERIODS.map((p) => ({ gun: p.days, label: p.label }))}
      />

      <section className="rounded-control bg-surface p-5 ring-1 ring-line">
        <h2 className="text-caption font-medium tracking-wide text-ink-muted uppercase">
          Vardiyaya göre
        </h2>
        {shiftTotal === 0 ? (
          <p className="mt-3 text-small text-ink-faint">
            Bu dönemde vardiya etiketli geri bildirim yok.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {shifts.map((row) => (
              <li key={row.shift}>
                <div className="flex items-baseline justify-between text-small">
                  <span className="font-medium">{row.label}</span>
                  <span className="tabular text-ink-muted">
                    {row.average !== null ? `${row.average.toFixed(2)} / 5` : "—"}
                    <span className="ml-2 text-ink-faint">{row.count} kayıt</span>
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-sunken">
                  <div
                    className={`h-full rounded-full ${toneFor(row.average)}`}
                    style={{ width: `${((row.average ?? 0) / 5) * 100}%` }}
                  />
                </div>
                {personelByShift.get(row.shift)?.length ? (
                  <p className="mt-1 text-caption text-ink-faint">
                    Bu dönem çizelgede: {personelByShift.get(row.shift)!.join(", ")}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-control bg-surface p-5 ring-1 ring-line">
        <h2 className="text-caption font-medium tracking-wide text-ink-muted uppercase">
          Masaya göre — en düşükten başlayarak
        </h2>
        {tables.length === 0 ? (
          <EmptyState>Bu dönemde masa etiketli geri bildirim yok.</EmptyState>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[420px] text-small">
              <thead className="border-b border-line text-left text-caption tracking-wide text-ink-muted uppercase">
                <tr>
                  <th className="py-2 font-medium">Masa</th>
                  <th className="py-2 font-medium">Ortalama</th>
                  <th className="py-2 font-medium">Kayıt</th>
                  <th className="w-1/3 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {tables.map((row) => (
                  <tr key={row.tableId}>
                    <td className="py-2.5 font-medium">{row.label}</td>
                    <td className="py-2.5 tabular text-ink-soft">
                      {row.average !== null ? row.average.toFixed(2) : "—"}
                    </td>
                    <td className="py-2.5 tabular text-ink-faint">{row.count}</td>
                    <td className="py-2.5">
                      <div className="h-2 overflow-hidden rounded-full bg-sunken">
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
            <p className="mt-3 text-caption text-ink-faint">
              Az kayıtlı masaların ortalaması yanıltıcı olabilir — kayıt sayısına
              da bakın.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
