"use client";

import { useActionState } from "react";
import { plusKaldir, plusYap, type PlusFormState } from "./actions";

const INPUT =
  "rounded-chip border border-line bg-surface px-2.5 py-1.5 text-caption outline-none focus:border-line-strong";

export function PlusYapForm({ appUserId }: { appUserId: string }) {
  const [state, formAction, pending] = useActionState<PlusFormState, FormData>(plusYap, {});

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="appUserId" value={appUserId} />
      <input
        type="number"
        name="gunSayisi"
        defaultValue={30}
        min={1}
        className={`${INPUT} w-16`}
        aria-label="Gün sayısı"
      />
      <span className="text-caption text-ink-faint">gün</span>
      <button
        type="submit"
        disabled={pending}
        className="rounded-chip bg-accent-600 px-2.5 py-1 text-caption font-medium text-white hover:bg-accent-700 disabled:bg-slate-400"
      >
        {pending ? "..." : "Plus yap"}
      </button>
      {state.error ? <span className="text-caption text-danger">{state.error}</span> : null}
    </form>
  );
}

export function PlusKaldirButonu({ appUserId }: { appUserId: string }) {
  return (
    <form action={plusKaldir}>
      <input type="hidden" name="appUserId" value={appUserId} />
      <button
        type="submit"
        className="rounded-chip px-2.5 py-1 text-caption text-ink-faint hover:text-danger"
      >
        Kaldır
      </button>
    </form>
  );
}
