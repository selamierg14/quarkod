"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FEEDBACK_STATUS_LIST, SHIFTS } from "@/lib/constants";
import { TarihGirdisi } from "@/components/ui";

type Props = {
  businesses: { id: string; name: string }[];
  showBusinessFilter: boolean;
};

const INPUT =
  "rounded-chip border border-line bg-surface px-3 py-2 text-small outline-none focus:border-line-strong";

export function FilterBar({ businesses, showBusinessFilter }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("sayfa");
    router.push(`/admin/geri-bildirimler?${next.toString()}`);
  }

  const hasFilters = [...params.keys()].some((key) => key !== "sayfa");

  return (
    <div className="print-hidden flex flex-wrap items-end gap-2 rounded-control bg-surface p-3 ring-1 ring-line">
      {showBusinessFilter ? (
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
        <span className="text-caption text-ink-muted">Durum</span>
        <select
          className={INPUT}
          value={params.get("durum") ?? ""}
          onChange={(event) => update("durum", event.target.value)}
        >
          <option value="">Hepsi</option>
          {FEEDBACK_STATUS_LIST.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-caption text-ink-muted">Puan</span>
        <select
          className={INPUT}
          value={params.get("puan") ?? ""}
          onChange={(event) => update("puan", event.target.value)}
        >
          <option value="">Hepsi</option>
          <option value="dusuk">3 ve altı</option>
          <option value="yuksek">4-5</option>
          {[1, 2, 3, 4, 5].map((star) => (
            <option key={star} value={String(star)}>
              Sadece {star} yıldız
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-caption text-ink-muted">Vardiya</span>
        <select
          className={INPUT}
          value={params.get("vardiya") ?? ""}
          onChange={(event) => update("vardiya", event.target.value)}
        >
          <option value="">Hepsi</option>
          {Object.entries(SHIFTS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-caption text-ink-muted">Başlangıç</span>
        <TarihGirdisi
          className={INPUT}
          deger={params.get("baslangic") ?? ""}
          onDegisim={(v) => update("baslangic", v)}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-caption text-ink-muted">Bitiş</span>
        <TarihGirdisi
          className={INPUT}
          deger={params.get("bitis") ?? ""}
          onDegisim={(v) => update("bitis", v)}
        />
      </label>

      <label className="flex flex-1 flex-col gap-1">
        <span className="text-caption text-ink-muted">Yorumda ara</span>
        <input
          type="search"
          placeholder="kelime..."
          className={`${INPUT} w-full min-w-40`}
          defaultValue={params.get("ara") ?? ""}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              update("ara", (event.target as HTMLInputElement).value);
            }
          }}
        />
      </label>

      {hasFilters ? (
        <button
          type="button"
          onClick={() => router.push("/admin/geri-bildirimler")}
          className="rounded-chip border border-line px-3 py-2 text-small text-ink-soft hover:bg-canvas"
        >
          Temizle
        </button>
      ) : null}
    </div>
  );
}
