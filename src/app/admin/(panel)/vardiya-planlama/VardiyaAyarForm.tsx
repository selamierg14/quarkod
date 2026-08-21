"use client";

import { useActionState, useState } from "react";
import { vardiyaAyarlariniGuncelle, type VardiyaAyarFormState } from "./actions";

const ALANLAR = [
  { key: "Sabah", label: "Sabah" },
  { key: "Ogle", label: "Öğle" },
  { key: "Aksam", label: "Akşam" },
  { key: "Gece", label: "Gece" },
] as const;

export function VardiyaAyarForm({
  businessId,
  ayarlar,
}: {
  businessId: string;
  ayarlar: Record<string, boolean | string>;
}) {
  const [acik, setAcik] = useState(false);
  const [state, formAction, pending] = useActionState<VardiyaAyarFormState, FormData>(
    vardiyaAyarlariniGuncelle,
    {},
  );

  return (
    <div className="rounded-control bg-surface ring-1 ring-line">
      <button
        type="button"
        onClick={() => setAcik((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-small font-medium text-ink-soft"
      >
        Hangi vardiyalar kullanılıyor, saat kaçta başlıyor?
        <span aria-hidden="true" className={`transition-transform ${acik ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {acik ? (
        <form action={formAction} className="flex flex-col gap-3 border-t border-line px-4 py-4">
          <input type="hidden" name="businessId" value={businessId} />

          <div className="grid gap-2 sm:grid-cols-2">
            {ALANLAR.map((alan) => (
              <label
                key={alan.key}
                className="flex items-center gap-2 rounded-chip bg-canvas px-3 py-2"
              >
                <input
                  type="checkbox"
                  name={`aktif${alan.key}`}
                  defaultChecked={Boolean(ayarlar[`vardiya${alan.key}Aktif`])}
                  className="h-4 w-4 accent-[var(--color-ink)]"
                />
                <span className="w-14 text-small">{alan.label}</span>
                <input
                  type="time"
                  name={`saat${alan.key}`}
                  defaultValue={String(ayarlar[`vardiya${alan.key}Saat`] ?? "")}
                  className="min-w-0 flex-1 rounded-chip border border-line bg-surface px-2 py-1 text-small outline-none focus:border-line-strong"
                />
              </label>
            ))}
          </div>
          <p className="text-caption text-ink-faint">
            Kapalı olan vardiya çizelgede görünmez ve müşteri geri
            bildirimlerinde etiketlenmez. Bitiş saati tutulmaz — bir sonraki
            açık vardiya başlayınca öncekinin süresi biter.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={pending}
              className="self-start rounded-control bg-accent-600 px-4 py-2 text-small font-medium text-white transition hover:bg-accent-700 disabled:bg-slate-400"
            >
              {pending ? "Kaydediliyor..." : "Kaydet"}
            </button>
            {state.error ? <p className="text-caption text-danger">{state.error}</p> : null}
            {state.saved ? <p className="text-caption text-success-ink">{state.saved}</p> : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}
