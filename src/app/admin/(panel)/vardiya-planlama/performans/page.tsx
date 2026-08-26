import { requirePersonelYonetimi, visibleBusinesses } from "@/lib/auth";
import { getPersonelPerformansi } from "@/lib/stats";
import { EmptyState, PageHeader, SectionCard, TabLink } from "@/components/ui";
import { IsletmeSecici } from "../../menu/MenuUst";
import { PeriyotFiltre } from "@/components/PeriyotFiltre";
import { ROL_ADLARI } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = { title: "Personel performansı" };

const PERIODS = [
  { days: 30, label: "Son 30 gün" },
  { days: 90, label: "Son 90 gün" },
];

export default async function PersonelPerformansPage({
  searchParams,
}: {
  searchParams: Promise<{ isletme?: string; gun?: string }>;
}) {
  const user = await requirePersonelYonetimi();
  const businesses = await visibleBusinesses(user);
  const query = await searchParams;

  if (businesses.length === 0) {
    return <EmptyState>Önce bir işletme ekleyin.</EmptyState>;
  }

  const secili = businesses.find((b) => b.id === query.isletme) ?? businesses[0];
  const days = PERIODS.some((p) => String(p.days) === query.gun) ? Number(query.gun) : 30;

  const performans = await getPersonelPerformansi(secili.id, days);

  return (
    <div className="flex flex-col gap-5">
      <div className="print-hidden -mb-2 flex gap-1 border-b border-line">
        <TabLink href="/admin/vardiya-planlama" active={false}>
          Çizelge
        </TabLink>
        <TabLink href="/admin/vardiya-planlama/sablon" active={false}>
          Görev şablonu
        </TabLink>
        <TabLink href="/admin/vardiya-planlama/performans" active>
          Performans
        </TabLink>
      </div>

      <PageHeader
        ikon="📊"
        renk="indigo"
        title="Personel performansı"
        description="Kişinin çalıştığı vardiyalarda müşterilerin bıraktığı ortalama puan. Yalnızca size görünür — personelin kendisi göremez."
      />

      <IsletmeSecici
        businesses={businesses}
        seciliId={secili.id}
        taban="/admin/vardiya-planlama/performans"
      />

      {/* İşletme seçimi üstteki IsletmeSecici sekmesinden geliyor; burada
          ikinci bir işletme seçici göstermemek için boş dizi veriliyor —
          PeriyotFiltre yalnızca dönem seçicisini render eder ve mevcut
          "isletme" parametresini olduğu gibi korur (useSearchParams'tan
          okuyup geri yazıyor). */}
      <PeriyotFiltre
        baseHref="/admin/vardiya-planlama/performans"
        businesses={[]}
        donemler={PERIODS.map((p) => ({ gun: p.days, label: p.label }))}
      />

      {performans.length === 0 ? (
        <EmptyState
          baslik="Henüz personel yok"
          ikon="◐"
        >
          Çizelge kurmak için önce &quot;işletme sorumlusu&quot; veya &quot;saha
          personeli&quot; rolünde bir kullanıcı ekleyin.
        </EmptyState>
      ) : (
        <SectionCard
          ikon="📊"
          renk="indigo"
          title="Kişi bazlı ortalama"
          description="Aynı vardiyada birden fazla kişi çalıştıysa puan ikisine de aynen yazılır — 'kimin servisi' değil 'hangi vardiya' ölçülüyor."
        >
          <ul className="flex flex-col divide-y divide-line">
            {performans.map((p) => (
              <li
                key={p.userId}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink">{p.name}</p>
                  <p className="text-caption text-ink-muted">
                    {ROL_ADLARI[p.role] ?? p.role} · {p.vardiyaSayisi} vardiya
                    {p.kayitSayisi > 0 ? ` · ${p.kayitSayisi} geri bildirim` : ""}
                  </p>
                </div>

                {p.ortalama === null ? (
                  <span className="shrink-0 text-caption text-ink-faint">
                    {p.vardiyaSayisi === 0
                      ? "Bu dönemde vardiyası yok"
                      : "Bu vardiyalarda henüz geri bildirim yok"}
                  </span>
                ) : (
                  <div className="flex shrink-0 items-center gap-3">
                    {p.kayitSayisi < 5 ? (
                      <span
                        className="rounded-full bg-sunken px-2 py-0.5 text-caption text-ink-faint"
                        title="Az veriyle hesaplanan ortalama, tek bir kötü/iyi puandan kolayca sapabilir."
                      >
                        az veri
                      </span>
                    ) : null}
                    {p.delta !== null && Math.abs(p.delta) >= 0.1 ? (
                      <span
                        className={`text-caption font-medium ${
                          p.delta > 0 ? "text-success-ink" : "text-danger-ink"
                        }`}
                      >
                        {p.delta > 0 ? "▲" : "▼"} {Math.abs(p.delta).toFixed(1)}
                      </span>
                    ) : null}
                    <span
                      className={`rounded-chip px-3 py-1.5 text-small font-semibold ${
                        p.ortalama >= 4
                          ? "bg-success-soft text-success-ink"
                          : p.ortalama >= 3
                            ? "bg-warning-soft text-warning-ink"
                            : "bg-danger-soft text-danger-ink"
                      }`}
                    >
                      {p.ortalama.toFixed(1)} / 5
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}
