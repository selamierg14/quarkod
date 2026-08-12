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
        <span className="text-caption font-medium tracking-wide text-ink-muted uppercase">
          Durum
        </span>
        <div className="mt-2 flex flex-wrap gap-2">
          {FEEDBACK_STATUS_LIST.map((option) => (
            <label
              key={option.value}
              className="cursor-pointer rounded-chip border border-line px-3 py-2 text-small has-checked:border-slate-900 has-checked:bg-ink has-checked:text-white"
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
        <span className="text-caption font-medium tracking-wide text-ink-muted uppercase">
          İç not
        </span>
        <textarea
          name="internalNote"
          rows={4}
          defaultValue={internalNote ?? ""}
          placeholder="Ne yapıldı? Kiminle konuşuldu?"
          className="w-full resize-none rounded-control border border-line p-3 text-small outline-none focus:border-line-strong"
        />
      </label>

      {state.error ? (
        <p className="rounded-chip bg-danger-soft px-3 py-2 text-small text-danger-ink">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p className="rounded-chip bg-success-soft px-3 py-2 text-small text-success-ink">
          Kaydedildi.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-control bg-ink px-4 py-2.5 text-small font-medium text-white disabled:bg-slate-400"
      >
        {pending ? "Kaydediliyor..." : "Kaydet"}
      </button>
    </form>
  );
}
