"use client";

import { useActionState } from "react";
import { SHIFTS } from "@/lib/constants";
import { shiftNotuEkle, toggleGorev, type GorevFormState } from "./actions";

const INPUT =
  "rounded-chip border border-line bg-surface px-3 py-2 text-small outline-none focus:border-line-strong";

/** Tıklayınca hemen gönderilen tek görev satırı. */
export function GorevKutusu({
  itemId,
  businessId,
  label,
  tamamlayan,
}: {
  itemId: string;
  businessId: string;
  label: string;
  /** Doluysa bugün kim tamamladı; boşsa henüz işaretlenmemiş. */
  tamamlayan: string | null;
}) {
  const tamam = tamamlayan !== null;

  return (
    <li>
      <form action={toggleGorev}>
        <input type="hidden" name="itemId" value={itemId} />
        <input type="hidden" name="businessId" value={businessId} />
        <button
          type="submit"
          className={`flex w-full items-center gap-2.5 rounded-chip px-2.5 py-2 text-left text-small transition ${
            tamam ? "bg-success-soft text-success-ink" : "bg-canvas text-ink-soft hover:bg-sunken"
          }`}
        >
          <span
            aria-hidden="true"
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
              tamam ? "border-success bg-success text-white" : "border-line-strong"
            }`}
          >
            {tamam ? "✓" : ""}
          </span>
          <span className="flex-1">
            {label}
            {tamam ? (
              <span className="block text-caption text-success-ink/70">
                {tamamlayan} tamamladı
              </span>
            ) : null}
          </span>
        </button>
      </form>
    </li>
  );
}

export function ShiftNotuFormu({
  businessId,
  varsayilanVardiya,
}: {
  businessId: string;
  varsayilanVardiya: string;
}) {
  const [state, formAction, pending] = useActionState<GorevFormState, FormData>(
    shiftNotuEkle,
    {},
  );

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-end gap-2">
      <input type="hidden" name="businessId" value={businessId} />

      <label className="flex flex-col gap-1">
        <span className="text-caption text-ink-muted">Vardiya</span>
        <select name="shift" defaultValue={varsayilanVardiya} className={INPUT}>
          {Object.entries(SHIFTS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-1 flex-col gap-1">
        <span className="text-caption text-ink-muted">Not</span>
        <input
          name="text"
          required
          placeholder="masa 5'te sorun oldu, dikkat..."
          className={`${INPUT} w-full`}
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-control bg-ink px-4 py-2 text-small font-medium text-white disabled:bg-slate-400"
      >
        {pending ? "Ekleniyor..." : "Ekle"}
      </button>

      {state.error ? (
        <p className="w-full text-caption text-danger">{state.error}</p>
      ) : null}
    </form>
  );
}
