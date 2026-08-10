import Link from "next/link";
import { requireUser, visibleBusinesses } from "@/lib/auth";
import { EmptyState } from "@/components/ui";
import { GUVENILIR_OY_SINIRI, enIyiEnKotu, urunPuanlari } from "@/lib/menu";
import { getItemRatings } from "@/lib/stats";

export const dynamic = "force-dynamic";

export const metadata = { title: "Ürünler" };

const DONEMLER = [
  { gun: 30, label: "Son 30 gün" },
  { gun: 90, label: "Son 90 gün" },
  { gun: 365, label: "Son 1 yıl" },
];

/** Ortalamaya göre renk: 3'ün altı kırmızı, 4'ün altı sarı. */
function renk(ortalama: number): string {
  if (ortalama < 3) return "bg-red-500";
  if (ortalama < 4) return "bg-amber-400";
  return "bg-emerald-500";
}

export default async function UrunlerPage({
  searchParams,
}: {
  searchParams: Promise<{ isletme?: string; gun?: string }>;
}) {
  const user = await requireUser();
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
        <h1 className="text-lg font-semibold tracking-tight">Ürün puanları</h1>
        <p className="mt-1 text-sm text-slate-500">
          Müşterilerin tek tek puanladığı ürünler. Genel memnuniyet düşükken
          sorunun hangi üründe olduğunu buradan görürsünüz.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {businesses.length > 1 ? (
          <div className="flex flex-wrap gap-1">
            <Link
              href={`/admin/urunler?gun=${gun}`}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                !query.isletme
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              Tümü
            </Link>
            {businesses.map((b) => (
              <Link
                key={b.id}
                href={`/admin/urunler?isletme=${b.id}&gun=${gun}`}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  query.isletme === b.id
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200"
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
              className={`rounded-lg px-3 py-1.5 text-sm ${
                gun === d.gun
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200"
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
          <p className="text-sm text-slate-500">
            {puanlar.length} ürün · {toplamOy} puan
          </p>

          {/* En iyi/en kötü yalnızca yeterli oyu olanlardan seçiliyor; tek
              kızgın müşterinin oyuyla "ayın en kötüsü" ilan etmek işletmeyi
              yanlış yere baktırırdı. */}
          {enIyi.length > 0 || enKotu.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                <h2 className="text-sm font-semibold text-emerald-700">En beğenilenler</h2>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {enIyi.map((u) => (
                    <li key={u.itemName} className="flex justify-between gap-3 text-sm">
                      <span className="truncate">{u.itemName}</span>
                      <span className="shrink-0 tabular-nums text-slate-500">
                        {u.ortalama.toFixed(1)} ({u.oySayisi})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                <h2 className="text-sm font-semibold text-red-700">En düşük puanlılar</h2>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {enKotu.map((u) => (
                    <li key={u.itemName} className="flex justify-between gap-3 text-sm">
                      <span className="truncate">{u.itemName}</span>
                      <span className="shrink-0 tabular-nums text-slate-500">
                        {u.ortalama.toFixed(1)} ({u.oySayisi})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Henüz hiçbir ürün {GUVENILIR_OY_SINIRI} oya ulaşmadı; &quot;en iyi/en
              kötü&quot; listesi bu yüzden boş. Aşağıdaki tablo tüm ürünleri
              gösteriyor.
            </p>
          )}

          <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-2 font-medium">Ürün</th>
                  <th className="px-4 py-2 text-right font-medium">Oy</th>
                  <th className="px-4 py-2 text-right font-medium">Ortalama</th>
                  <th className="w-1/3 px-4 py-2 font-medium">&nbsp;</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {puanlar.map((u) => (
                  <tr key={u.menuItemId ?? u.itemName}>
                    <td className="px-4 py-2">
                      {u.itemName}
                      {u.azVeri ? (
                        <span
                          className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500"
                          title={`${GUVENILIR_OY_SINIRI} oydan az; yorumlarken dikkat edin`}
                        >
                          az veri
                        </span>
                      ) : null}
                      {u.menuItemId === null ? (
                        <span className="ml-2 text-[11px] text-slate-400">
                          (menüden kaldırılmış)
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-500">
                      {u.oySayisi}
                    </td>
                    <td className="px-4 py-2 text-right font-medium tabular-nums">
                      {u.ortalama.toFixed(1)}
                    </td>
                    <td className="px-4 py-2">
                      <div className="h-2 w-full rounded-full bg-slate-100">
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
