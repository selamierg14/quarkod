"use client";

import { useActionState, useState } from "react";
import type { Shift } from "@/lib/constants";
import { degisimTalepEt, type DegisimFormState } from "./actions";

export function DegisimTalebi({
  assignmentId,
  label,
  bekliyor,
  koyu,
  vardiyaSecenekleri,
}: {
  assignmentId: string;
  label: string;
  /** Zaten bekleyen bir talep varsa true — tekrar talep açtırmıyoruz. */
  bekliyor: boolean;
  /** Bugünün kartı koyu zeminli; kontrast tersine dönmeli. */
  koyu: boolean;
  /** Hedef vardiya seçimi için — işletmenin etkin vardiyaları. */
  vardiyaSecenekleri: readonly (readonly [Shift, string])[];
}) {
  const [acik, setAcik] = useState(false);
  const [hedefIsteniyor, setHedefIsteniyor] = useState(false);
  const [state, formAction, pending] = useActionState<DegisimFormState, FormData>(
    degisimTalepEt,
    {},
  );

  const beklemedeMi = bekliyor || state.saved;
  const girdiSinifi = koyu
    ? "border-white/25 bg-white/10 text-white placeholder:text-white/50"
    : "border-line bg-surface";

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
            talep bekliyor
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setAcik((v) => !v)}
            className={`text-caption underline underline-offset-2 ${
              koyu ? "text-white/70 hover:text-white" : "text-ink-faint hover:text-ink-soft"
            }`}
          >
            değişim / bırakma talep et
          </button>
        )}
      </span>

      {acik && !beklemedeMi ? (
        <form action={formAction} className="flex w-full flex-col gap-1.5">
          <input type="hidden" name="assignmentId" value={assignmentId} />

          {/* İki mod: sadece bırak (hedefsiz, kimse otomatik gelmez) ya da
              belirli bir gün+vardiyaya geçmek istediğini söyle (hedefli —
              karşı tarafta tam tersini isteyen biri varsa otomatik eşleşir). */}
          <div className={`flex gap-3 text-caption ${koyu ? "text-white/80" : "text-ink-soft"}`}>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="mod"
                checked={!hedefIsteniyor}
                onChange={() => setHedefIsteniyor(false)}
              />
              Sadece bırak
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="mod"
                checked={hedefIsteniyor}
                onChange={() => setHedefIsteniyor(true)}
                disabled={vardiyaSecenekleri.length === 0}
              />
              Belirli bir vardiyaya geçmek istiyorum
            </label>
          </div>

          {hedefIsteniyor ? (
            <>
              <p className={`text-caption ${koyu ? "text-white/70" : "text-ink-faint"}`}>
                Karşı tarafta tam tersini isteyen biri varsa otomatik eşleşir;
                yoksa yöneticiniz hedef boşsa taşır, doluysa bekletir.
              </p>
              <div className="flex gap-1.5">
                <input
                  type="date"
                  name="hedefTarih"
                  required
                  className={`min-w-0 flex-1 rounded-chip border px-2.5 py-1.5 text-caption outline-none ${girdiSinifi}`}
                />
                <select
                  name="hedefVardiya"
                  required
                  defaultValue=""
                  className={`min-w-0 flex-1 rounded-chip border px-2.5 py-1.5 text-caption outline-none ${girdiSinifi}`}
                >
                  <option value="" disabled>
                    Vardiya seç
                  </option>
                  {vardiyaSecenekleri.map(([deger, etiket]) => (
                    <option key={deger} value={deger}>
                      {etiket}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <p className={`text-caption ${koyu ? "text-white/70" : "text-ink-faint"}`}>
              Onaylanırsa bu vardiya boşalır; kimseyle otomatik takas olmaz,
              yöneticiniz yerine birini atar.
            </p>
          )}

          <input
            name="note"
            placeholder="sebep (isteğe bağlı)"
            className={`rounded-chip border px-2.5 py-1.5 text-caption outline-none ${girdiSinifi}`}
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
