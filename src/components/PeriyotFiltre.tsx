"use client";

import { useRouter, useSearchParams } from "next/navigation";

const INPUT =
  "rounded-chip border border-line bg-surface px-3 py-2 text-small outline-none focus:border-line-strong";

/**
 * Kırılım ve Ürün puanları ekranlarındaki İşletme/Dönem seçimi. Eskiden
 * hap düğmeler (pill) dizisiydi; Geri bildirimler'deki dropdown filtre
 * çubuğuyla aynı görünüme getirildi — panelde tek bir filtre dili olsun.
 */
export function PeriyotFiltre({
  baseHref,
  businesses,
  donemler,
}: {
  baseHref: string;
  businesses: { id: string; name: string }[];
  donemler: { gun: number; label: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`${baseHref}?${next.toString()}`);
  }

  return (
    <div className="print-hidden flex flex-wrap items-end gap-2 rounded-control bg-surface p-3 ring-1 ring-line">
      {businesses.length > 1 ? (
        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">İşletme</span>
          <select
            className={INPUT}
            value={params.get("isletme") ?? ""}
            onChange={(event) => update("isletme", event.target.value)}
          >
            <option value="">Hepsi</option>
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="flex flex-col gap-1">
        <span className="text-caption text-ink-muted">Dönem</span>
        <select
          className={INPUT}
          value={params.get("gun") ?? String(donemler[0]?.gun ?? "")}
          onChange={(event) => update("gun", event.target.value)}
        >
          {donemler.map((donem) => (
            <option key={donem.gun} value={donem.gun}>
              {donem.label}
            </option>
          ))}
        </select>
      </label>

      {params.has("isletme") ? (
        <button
          type="button"
          onClick={() => router.push(baseHref)}
          className="rounded-chip border border-line px-3 py-2 text-small text-ink-soft hover:bg-canvas"
        >
          Temizle
        </button>
      ) : null}
    </div>
  );
}
