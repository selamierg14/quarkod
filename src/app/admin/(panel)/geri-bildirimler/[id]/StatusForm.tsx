"use client";

import { useActionState } from "react";
import { FEEDBACK_STATUS_LIST } from "@/lib/constants";
import { updateFeedback, type UpdateState } from "./actions";

export function StatusForm({
  id,
  status,
  internalNote,
  internalNoteBy,
  internalNoteAt,
}: {
  id: string;
  status: string;
  internalNote: string | null;
  /** Notu en son yazan kişinin adı; hiç yazılmadıysa null. */
  internalNoteBy: string | null;
  /** O yazının anı; hiç yazılmadıysa null. */
  internalNoteAt: string | null;
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
        {/* "Kim yazdı, ne zaman yazdı" ekranda hiç görünmüyordu — not tek
            bir metin kutusuydu, üzerine her kaydedilişte sessizce
            değişiyordu. Yalnızca metin gerçekten değiştiğinde bu ikisi
            güncelleniyor (bkz. actions.ts). */}
        {internalNoteBy ? (
          <span className="text-caption text-ink-faint">
            Son yazan: <strong className="font-medium text-ink-soft">{internalNoteBy}</strong>
            {internalNoteAt ? ` — ${internalNoteAt}` : ""}
          </span>
        ) : null}
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
        className="rounded-control bg-accent-600 px-4 py-2.5 text-small font-medium text-white transition hover:bg-accent-700 disabled:bg-slate-400"
      >
        {pending ? "Kaydediliyor..." : "Kaydet"}
      </button>
    </form>
  );
}
