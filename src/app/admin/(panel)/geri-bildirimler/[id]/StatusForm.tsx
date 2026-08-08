"use client";

import { useActionState } from "react";
import { FEEDBACK_STATUS_LIST } from "@/lib/constants";
import { updateFeedback, type UpdateState } from "./actions";

export function StatusForm({
  id,
  status,
  internalNote,
}: {
  id: string;
  status: string;
  internalNote: string | null;
}) {
  const [state, formAction, pending] = useActionState<UpdateState, FormData>(
    updateFeedback,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />

      <div>
        <span className="text-xs font-medium tracking-wide text-slate-500 uppercase">
          Durum
        </span>
        <div className="mt-2 flex flex-wrap gap-2">
          {FEEDBACK_STATUS_LIST.map((option) => (
            <label
              key={option.value}
              className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm has-checked:border-slate-900 has-checked:bg-slate-900 has-checked:text-white"
            >
              <input
                type="radio"
                name="status"
                value={option.value}
                defaultChecked={status === option.value}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      <label className="mt-2 flex flex-col gap-2">
        <span className="text-xs font-medium tracking-wide text-slate-500 uppercase">
          İç not
        </span>
        <textarea
          name="internalNote"
          rows={4}
          defaultValue={internalNote ?? ""}
          placeholder="Ne yapıldı? Kiminle konuşuldu?"
          className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-slate-400"
        />
      </label>

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Kaydedildi.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:bg-slate-400"
      >
        {pending ? "Kaydediliyor..." : "Kaydet"}
      </button>
    </form>
  );
}
