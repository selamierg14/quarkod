"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FEEDBACK_STATUS_LIST, SHIFTS } from "@/lib/constants";

type Props = {
  businesses: { id: string; name: string }[];
  showBusinessFilter: boolean;
};

const INPUT =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400";

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
    <div className="print-hidden flex flex-wrap items-end gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
      {showBusinessFilter ? (
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">İşletme</span>
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
        <span className="text-xs text-slate-500">Durum</span>
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
        <span className="text-xs text-slate-500">Puan</span>
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
        <span className="text-xs text-slate-500">Vardiya</span>
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
        <span className="text-xs text-slate-500">Başlangıç</span>
        <input
          type="date"
          className={INPUT}
          value={params.get("baslangic") ?? ""}
          onChange={(event) => update("baslangic", event.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-500">Bitiş</span>
        <input
          type="date"
          className={INPUT}
          value={params.get("bitis") ?? ""}
          onChange={(event) => update("bitis", event.target.value)}
        />
      </label>

      <label className="flex flex-1 flex-col gap-1">
        <span className="text-xs text-slate-500">Yorumda ara</span>
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
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          Temizle
        </button>
      ) : null}
    </div>
  );
}
