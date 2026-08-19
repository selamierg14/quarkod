import Link from "next/link";
import { requireTenant, visibleBusinesses } from "@/lib/auth";
import { EmptyState } from "@/components/ui";
import { GUVENILIR_OY_SINIRI, enIyiEnKotu, urunPuanlari } from "@/lib/menu";
import { getItemRatings } from "@/lib/stats";

export const dynamic = "force-dynamic";

export const metadata = { title: "Ürün puanları" };

const DONEMLER = [
  { gun: 30, label: "Son 30 gün" },
  { gun: 90, label: "Son 90 gün" },
  { gun: 365, label: "Son 1 yıl" },
];

/** Ortalamaya göre renk: 3'ün altı kırmızı, 4'ün altı sarı. */
function renk(ortalama: number): string {
  if (ortalama < 3) return "bg-danger";
  if (ortalama < 4) return "bg-rating";
  return "bg-success";
}

export default async function UrunlerPage({
  searchParams,
}: {
  searchParams: Promise<{ isletme?: string; gun?: string }>;
}) {
  const user = await requireTenant();
  const businesses = await visibleBusinesses(user);
  const allowedIds = businesses.map((b) => b.id);
  const query = await searchParams;

  const secili =
    query.isletme && allowedIds.includes(query.isletme) ? [query.isletme] : allowedIds;
  const gun = DONEMLER.some((d) => String(d.gun) === query.gun) ? Number(query.gun) : 30;

  const satirlar = await getItemRatings(secili, gun);

  const puanlar = urunPuanlari(satirlar);
  const { enIyi, enKotu } = enIyiEnKotu(puanlar);
  const toplamOy = satirlar.length;

  const linkTabani = (yeni: Record<string, string>) => {
    const p = new URLSearchParams();
    if (query.isletme) p.set("isletme", query.isletme);
    p.set("gun", String(gun));
    for (const [k, v] of Object.entries(yeni)) p.set(k, v);
    return `/admin/urunler?${p.toString()}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-title font-semibold">Ürün puanları</h1>
        <p className="mt-1 text-small text-ink-muted">
          Müşterilerin tek tek puanladığı ürünler. Genel memnuniyet düşükken
          sorunun hangi üründe olduğunu buradan görürsünüz.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {businesses.length > 1 ? (
          <div className="flex flex-wrap gap-1">
            <Link
              href={`/admin/urunler?gun=${gun}`}
              className={`rounded-chip px-3 py-1.5 text-small ${
                !query.isletme
                  ? "bg-ink text-white"
                  : "bg-surface text-ink-soft ring-1 ring-line"
              }`}
            >
              Tümü
            </Link>
            {businesses.map((b) => (
              <Link
                key={b.id}
                href={`/admin/urunler?isletme=${b.id}&gun=${gun}`}
                className={`rounded-chip px-3 py-1.5 text-small ${
                  query.isletme === b.id
                    ? "bg-ink text-white"
                    : "bg-surface text-ink-soft ring-1 ring-line"
                }`}
              >
                {b.name}
              </Link>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-1">
          {DONEMLER.map((d) => (
            <Link
              key={d.gun}
              href={linkTabani({ gun: String(d.gun) })}
              className={`rounded-chip px-3 py-1.5 text-small ${
                gun === d.gun
                  ? "bg-ink text-white"
                  : "bg-surface text-ink-soft ring-1 ring-line"
              }`}
            >
              {d.label}
            </Link>
          ))}
        </div>
      </div>

      {puanlar.length === 0 ? (
        <EmptyState>
          Bu dönemde ürün puanı yok. Müşteriler QR menüden ne aldıklarını seçip
          puanladıkça burası dolar — menüde ürün tanımlı olduğundan emin olun.
        </EmptyState>
      ) : (
        <>
          <p className="text-small text-ink-muted">
            {puanlar.length} ürün · {toplamOy} puan
          </p>

          {/* En iyi/en kötü yalnızca yeterli oyu olanlardan seçiliyor; tek
              kızgın müşterinin oyuyla "ayın en kötüsü" ilan etmek işletmeyi
              yanlış yere baktırırdı. */}
          {enIyi.length > 0 || enKotu.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-control bg-surface p-4 ring-1 ring-line">
                <h2 className="text-small font-semibold text-success-ink">En beğenilenler</h2>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {enIyi.map((u) => (
                    <li key={u.itemName} className="flex justify-between gap-3 text-small">
                      <span className="truncate">{u.itemName}</span>
                      <span className="shrink-0 tabular text-ink-muted">
                        {u.ortalama.toFixed(1)} ({u.oySayisi})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-control bg-surface p-4 ring-1 ring-line">
                <h2 className="text-small font-semibold text-danger-ink">En düşük puanlılar</h2>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {enKotu.map((u) => (
                    <li key={u.itemName} className="flex justify-between gap-3 text-small">
                      <span className="truncate">{u.itemName}</span>
                      <span className="shrink-0 tabular text-ink-muted">
                        {u.ortalama.toFixed(1)} ({u.oySayisi})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="rounded-control bg-warning-soft px-4 py-3 text-small text-warning-ink">
              Henüz hiçbir ürün {GUVENILIR_OY_SINIRI} oya ulaşmadı; &quot;en iyi/en
              kötü&quot; listesi bu yüzden boş. Aşağıdaki tablo tüm ürünleri
              gösteriyor.
            </p>
          )}

          <div className="overflow-hidden rounded-control bg-surface ring-1 ring-line">
            <table className="w-full text-small">
              <thead className="bg-canvas text-left text-caption text-ink-muted uppercase">
                <tr>
                  <th className="px-4 py-2 font-medium">Ürün</th>
                  <th className="px-4 py-2 text-right font-medium">Oy</th>
                  <th className="px-4 py-2 text-right font-medium">Ortalama</th>
                  <th className="w-1/3 px-4 py-2 font-medium">&nbsp;</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {puanlar.map((u) => (
                  <tr key={u.menuItemId ?? u.itemName}>
                    <td className="px-4 py-2">
                      {u.itemName}
                      {u.azVeri ? (
                        <span
                          className="ml-2 rounded bg-sunken px-1.5 py-0.5 text-[11px] text-ink-muted"
                          title={`${GUVENILIR_OY_SINIRI} oydan az; yorumlarken dikkat edin`}
                        >
                          az veri
                        </span>
                      ) : null}
                      {u.menuItemId === null ? (
                        <span className="ml-2 text-[11px] text-ink-faint">
                          (menüden kaldırılmış)
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2 text-right tabular text-ink-muted">
                      {u.oySayisi}
                    </td>
                    <td className="px-4 py-2 text-right font-medium tabular">
                      {u.ortalama.toFixed(1)}
                    </td>
                    <td className="px-4 py-2">
                      <div className="h-2 w-full rounded-full bg-sunken">
                        <div
                          className={`h-2 rounded-full ${renk(u.ortalama)}`}
                          style={{ width: `${(u.ortalama / 5) * 100}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
