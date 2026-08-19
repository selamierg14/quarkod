import { allowedBusinessIds, requireTenantOwner } from "@/lib/auth";
import { getBusinessStats } from "@/lib/stats";
import { EmptyState, TabLink } from "@/components/ui";
import { DeltaBadge, TrendChart } from "@/components/TrendChart";

export const dynamic = "force-dynamic";

export const metadata = { title: "Şube karşılaştırma" };

export default async function ComparisonPage() {
  const user = await requireTenantOwner();
  // Kapsamsız çağrı bütün kiracıların işletmelerini getirirdi.
  const stats = await getBusinessStats(await allowedBusinessIds(user));
  const withData = stats.filter((stat) => stat.total > 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="print-hidden -mb-2 flex gap-1 border-b border-line">
        <TabLink href="/admin" active={false}>
          Genel
        </TabLink>
        <TabLink href="/admin/kiyaslama" active>
          Şube karşılaştırma
        </TabLink>
      </div>

      <div>
        <h1 className="text-title font-semibold">Şube karşılaştırma</h1>
        <p className="mt-1 text-small text-ink-muted">
          Kategori setleri işletmeye göre değiştiği için karşılaştırma genel
          yıldız ortalaması üzerinden yapılır. Kategori kırılımı her işletmenin
          kendi içinde anlamlıdır.
        </p>
      </div>

      {withData.length === 0 ? (
        <EmptyState>Kıyaslama için henüz yeterli geri bildirim yok.</EmptyState>
      ) : (
        <>
          <section className="rounded-control bg-surface p-5 ring-1 ring-line">
            <h2 className="text-caption font-medium tracking-wide text-ink-muted uppercase">
              Genel ortalama
            </h2>
            <ul className="mt-4 space-y-3">
              {[...withData]
                .sort((a, b) => (b.average ?? 0) - (a.average ?? 0))
                .map((stat) => (
                  <li key={stat.id}>
                    <div className="flex items-baseline justify-between text-small">
                      <span className="font-medium">{stat.name}</span>
                      <span className="tabular text-ink-muted">
                        {stat.average?.toFixed(2)} / 5 · {stat.total} kayıt
                      </span>
                    </div>
                    <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-sunken">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${((stat.average ?? 0) / 5) * 100}%`,
                          backgroundColor: stat.brandColor,
                        }}
                      />
                    </div>
                  </li>
                ))}
            </ul>
          </section>

          <section className="rounded-control bg-surface p-5 ring-1 ring-line">
            <h2 className="text-caption font-medium tracking-wide text-ink-muted uppercase">
              Haftalık ortalama puan seyri
            </h2>
            <p className="mt-1 text-small text-ink-muted">
              Her nokta bir haftanın <strong>ortalama yıldız puanını</strong>{" "}
              gösterir (dikey eksen 1–5). Yatay eksen hafta başlangıç tarihidir.
              Veri gelmeyen haftalarda çizgi kesilir — sıfır puan almış gibi
              görünmesin diye.
            </p>
            <div className="mt-4 space-y-5">
              {withData.map((stat) => (
                <div key={stat.id}>
                  <div className="flex items-baseline justify-between text-small">
                    <span className="flex items-center gap-2 font-medium">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: stat.brandColor }}
                      />
                      {stat.name}
                    </span>
                    <DeltaBadge delta={stat.delta} />
                  </div>
                  <TrendChart points={stat.trend} color={stat.brandColor} />
                  <p className="-mt-1 text-caption text-ink-faint">
                    Son 12 hafta ·{" "}
                    {stat.trend.filter((t) => t.count > 0).length} haftada veri var ·
                    genel ortalama {stat.average?.toFixed(2) ?? "—"}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            {withData.map((stat) => (
              <div
                key={stat.id}
                className="rounded-control bg-surface p-5 ring-1 ring-line"
              >
                <h3 className="flex items-center gap-2 font-medium">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: stat.brandColor }}
                  />
                  {stat.name}
                </h3>
                <p className="mt-1 text-caption text-ink-faint">
                  Son 7 gün: {stat.last7Days} kayıt
                  {stat.last30Average !== null
                    ? ` · son 30 gün ortalaması ${stat.last30Average.toFixed(2)}`
                    : ""}
                </p>

                {stat.weakCategories.length === 0 ? (
                  <p className="mt-4 text-small text-ink-faint">
                    Son 90 günde kategori puanı girilmemiş.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-2">
                    {stat.weakCategories.map((category) => (
                      <li key={category.name} className="text-small">
                        <div className="flex items-baseline justify-between">
                          <span className="text-ink-soft">{category.name}</span>
                          <span className="tabular text-ink-muted">
                            {category.average.toFixed(1)}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sunken">
                          <div
                            className={`h-full rounded-full ${
                              category.average < 3
                                ? "bg-danger"
                                : category.average < 4
                                  ? "bg-rating"
                                  : "bg-success"
                            }`}
                            style={{ width: `${(category.average / 5) * 100}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
