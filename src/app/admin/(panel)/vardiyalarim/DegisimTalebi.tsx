"use client";

import { useActionState, useState } from "react";
import { degisimTalepEt, type DegisimFormState } from "./actions";

export function DegisimTalebi({
  assignmentId,
  label,
  bekliyor,
  koyu,
}: {
  assignmentId: string;
  label: string;
  /** Zaten bekleyen bir talep varsa true — tekrar talep açtırmıyoruz. */
  bekliyor: boolean;
  /** Bugünün kartı koyu zeminli; kontrast tersine dönmeli. */
  koyu: boolean;
}) {
  const [acik, setAcik] = useState(false);
  const [state, formAction, pending] = useActionState<DegisimFormState, FormData>(
    degisimTalepEt,
    {},
  );

  const beklemedeMi = bekliyor || state.saved;

  return (
    <div className="flex flex-col items-start gap-1">
      <span
        className={`flex items-center gap-2 rounded-chip px-3 py-1.5 text-small font-medium ${
          koyu ? "bg-white/15 text-white" : "bg-sunken text-ink-soft"
        }`}
      >
        {label}
        {beklemedeMi ? (
          <span
            className={`rounded-full px-1.5 py-0.5 text-caption font-normal ${
              koyu ? "bg-white/20" : "bg-warning-soft text-warning-ink"
            }`}
          >
            bırakma talebi bekliyor
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setAcik((v) => !v)}
            className={`text-caption underline underline-offset-2 ${
              koyu ? "text-white/70 hover:text-white" : "text-ink-faint hover:text-ink-soft"
            }`}
          >
            bu vardiyayı bırak
          </button>
        )}
      </span>

      {/* "Değişim" kelimesi biriyle takas çağrıştırıyor ama sistemde otomatik
          bir yer değiştirme yok: onaylanırsa vardiya sadece boşalıyor,
          yöneticinin başka birini ataması gerekiyor — bu satır o beklentiyi
          baştan düzeltiyor. */}
      {acik && !beklemedeMi ? (
        <form action={formAction} className="flex w-full flex-col gap-1.5">
          <input type="hidden" name="assignmentId" value={assignmentId} />
          <p className={`text-caption ${koyu ? "text-white/70" : "text-ink-faint"}`}>
            Onaylanırsa bu vardiya boşalır; kimseyle otomatik takas olmaz,
            yöneticiniz yerine birini atar.
          </p>
          <input
            name="note"
            placeholder="sebep (isteğe bağlı)"
            className={`rounded-chip border px-2.5 py-1.5 text-caption outline-none ${
              koyu
                ? "border-white/25 bg-white/10 text-white placeholder:text-white/50"
                : "border-line bg-surface"
            }`}
          />
          <div className="flex gap-1.5">
            <button
              type="submit"
              disabled={pending}
              className="rounded-chip bg-accent-600 px-2.5 py-1 text-caption font-medium text-white transition hover:bg-accent-700 disabled:bg-slate-400"
            >
              {pending ? "Gönderiliyor..." : "Talebi gönder"}
            </button>
            <button
              type="button"
              onClick={() => setAcik(false)}
              className={`rounded-chip px-2.5 py-1 text-caption ${koyu ? "text-white/70" : "text-ink-muted"}`}
            >
              Vazgeç
            </button>
          </div>
          {state.error ? (
            <p className={`text-caption ${koyu ? "text-white" : "text-danger"}`}>{state.error}</p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
