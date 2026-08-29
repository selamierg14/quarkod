import { BarChart3, TrendingUp, Trophy } from "lucide-react";
import { allowedBusinessIds, requireModul, requireTenantOwner } from "@/lib/auth";
import { getBusinessStats } from "@/lib/stats";
import { EmptyState, PageHeader, SectionCard, TabLink } from "@/components/ui";
import { DeltaBadge, TrendChart } from "@/components/TrendChart";

export const dynamic = "force-dynamic";

export const metadata = { title: "Şube karşılaştırma" };

export default async function ComparisonPage() {
  const user = await requireTenantOwner();
  // Sayfa geri bildirim istatistiği gösteriyor; anket modülüne bağlı.
  // Özet'in (/admin) kendisi bilerek kapısız: requireModul oraya
  // yönlendirdiği için kapı koymak sonsuz döngü olurdu.
  await requireModul("anket");
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
        <PageHeader
          ikon={<BarChart3 className="h-4 w-4" aria-hidden="true" />}
          renk="violet"
          title="Şube karşılaştırma"
          description={
            <>
              Kategori setleri işletmeye göre değiştiği için karşılaştırma
              genel yıldız ortalaması üzerinden yapılır. Kategori kırılımı her
              işletmenin kendi içinde anlamlıdır.
            </>
          }
        />
      </div>

      {withData.length === 0 ? (
        <EmptyState>Kıyaslama için henüz yeterli geri bildirim yok.</EmptyState>
      ) : (
        <>
          <SectionCard
            ikon={<Trophy className="h-4 w-4" aria-hidden="true" />}
            renk="violet"
            title="Genel ortalama"
            description="Yüksekten düşüğe sıralı; çubuğun rengi işletmenin marka rengidir."
          >
            <ul className="space-y-3">
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
          </SectionCard>

          <SectionCard
            ikon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
            renk="sky"
            title="Haftalık ortalama puan seyri"
            description="Son 12 hafta; dikey eksen 1–5 yıldız."
          >
            <p className="-mt-1 mb-4 text-small text-ink-muted">
              Her nokta bir haftanın <strong>ortalama yıldız puanını</strong>{" "}
              gösterir. Yatay eksen hafta başlangıç tarihidir. Veri gelmeyen
              haftalarda çizgi kesilir — sıfır puan almış gibi görünmesin diye.
            </p>
            <div className="space-y-5">
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
          </SectionCard>

          <section className="grid gap-4 lg:grid-cols-3">
            {withData.map((stat) => (
              <div
                key={stat.id}
                className="overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-line"
              >
                {/* Şubenin kendi marka rengi kartın tepesinde ince bir şerit:
                    üç kartı yan yana görürken hangisinin hangisi olduğu
                    yazıyı okumadan anlaşılıyor. */}
                <span
                  aria-hidden="true"
                  className="block h-1.5 w-full"
                  style={{ backgroundColor: stat.brandColor }}
                />
                <div className="p-5">
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
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
