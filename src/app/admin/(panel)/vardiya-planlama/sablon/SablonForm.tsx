"use client";

import { useActionState } from "react";
import { gorevEkle, type SablonFormState } from "./actions";
import { alanOzellikleri } from "@/lib/cekirdek/desenler";
import { buttonClass } from "@/components/ui";

const INPUT =
  "rounded-control border border-line bg-surface px-3 py-2 text-small text-ink outline-none placeholder:text-ink-faint transition focus:border-accent-500 focus:ring-2 focus:ring-accent-100";

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
          {...alanOzellikleri("kisaBaslik")}
          required
          placeholder="Buzdolabı sıcaklığı kontrol edildi"
          className={`${INPUT} w-full`}
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className={buttonClass({ size: "md" })}
      >
        {pending ? "Ekleniyor..." : "Ekle"}
      </button>

      {state.error ? <p className="w-full text-caption text-danger" role="alert">{state.error}</p> : null}
      {state.saved ? (
        <p className="w-full text-caption text-success-ink" role="status">{state.saved}</p>
      ) : null}
    </form>
  );
}
