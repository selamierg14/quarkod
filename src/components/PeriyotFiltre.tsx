"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { buttonClass } from "@/components/ui";

const INPUT =
  "rounded-control border border-line bg-surface px-3 py-2 text-small text-ink outline-none placeholder:text-ink-faint transition focus:border-accent-500 focus:ring-2 focus:ring-accent-100";

/**
 * Kırılım ve Ürün puanları ekranlarındaki İşletme/Dönem seçimi. Eskiden
 * hap düğmeler (pill) dizisiydi; Geri bildirimler'deki dropdown filtre
 * çubuğuyla aynı görünüme getirildi — panelde tek bir filtre dili olsun.
 */
export function PeriyotFiltre({
  baseHref,
  businesses,
  donemler,
  varsayilan,
}: {
  baseHref: string;
  businesses: { id: string; name: string }[];
  donemler: { gun: number; label: string }[];
  /**
   * Sayfanın parametre yokken GERÇEKTEN kullandığı dönem. Önceden kutu
   * listenin ilk seçeneğini gösteriyordu (ör. "Son 1 gün") ama sayfa 30
   * günle sorguluyordu: ekranda yazan dönem ile veri farklıydı (QA).
   */
  varsayilan: number;
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
          value={params.get("gun") ?? String(varsayilan)}
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
          className={buttonClass({ variant: "secondary", size: "sm" })}
        >
          Temizle
        </button>
      ) : null}
    </div>
  );
}
