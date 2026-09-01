"use client";

import { useActionState } from "react";
import { gorevEkle, type SablonFormState } from "./actions";

const INPUT =
  "rounded-chip border border-line bg-surface px-3 py-2 text-small outline-none focus:border-line-strong";

export function SablonForm({ businessId }: { businessId: string }) {
  const [state, formAction, pending] = useActionState<SablonFormState, FormData>(
    gorevEkle,
    {},
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="businessId" value={businessId} />

      <label className="flex flex-col gap-1">
        <span className="text-caption text-ink-muted">Ne zaman</span>
        <select name="gorev" defaultValue="acilis" className={INPUT}>
          <option value="acilis">Açılış</option>
          <option value="kapanis">Kapanış</option>
        </select>
      </label>

      <label className="flex flex-1 flex-col gap-1">
        <span className="text-caption text-ink-muted">Görev</span>
        <input
          name="label"
          required
          placeholder="Buzdolabı sıcaklığı kontrol edildi"
          className={`${INPUT} w-full`}
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-control bg-accent-600 px-4 py-2 text-small font-medium text-white transition hover:bg-accent-700 disabled:bg-slate-400"
      >
        {pending ? "Ekleniyor..." : "Ekle"}
      </button>

      {state.error ? <p className="w-full text-caption text-danger">{state.error}</p> : null}
      {state.saved ? (
        <p className="w-full text-caption text-success-ink">{state.saved}</p>
      ) : null}
    </form>
  );
}
