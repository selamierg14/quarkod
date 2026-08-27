"use client";

import { useActionState } from "react";
import { CalendarPlus } from "lucide-react";
import { SectionCard } from "@/components/ui";
import { IZIN_TURLERI } from "@/lib/izin";
import { izinEkle, type IzinFormState } from "./actions";

const INPUT =
  "w-full rounded-chip border border-line bg-surface px-3 py-2 text-small outline-none focus:border-line-strong";

/** Yöneticinin doğrudan izin girmesi — kayıt onaylı doğar. */
export function IzinEkleForm({
  businessId,
  personel,
}: {
  businessId: string;
  personel: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<IzinFormState, FormData>(
    izinEkle,
    {},
  );

  return (
    <SectionCard
      ikon={<CalendarPlus className="h-4 w-4" aria-hidden="true" />}
      renk="emerald"
      title="İzin gir"
      description="Sözlü verilmiş bir izni ya da sonradan gelen raporu kayda geçirin. Buradan girilen izin doğrudan onaylı sayılır."
    >
      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="businessId" value={businessId} />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-caption text-ink-muted">Personel</span>
            <select name="userId" required defaultValue="" className={INPUT}>
              <option value="" disabled>
                Seçin
              </option>
              {personel.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-caption text-ink-muted">Tür</span>
            <select name="tur" defaultValue="yillik" className={INPUT}>
              {Object.entries(IZIN_TURLERI).map(([deger, etiket]) => (
                <option key={deger} value={deger}>
                  {etiket}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-caption text-ink-muted">Başlangıç</span>
            <input name="baslangic" type="date" required className={INPUT} />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-caption text-ink-muted">Bitiş</span>
            <input name="bitis" type="date" required className={INPUT} />
          </label>

          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-caption text-ink-muted">Açıklama (isteğe bağlı)</span>
            <input name="aciklama" placeholder="Düğün, rapor no, okul günü…" className={INPUT} />
          </label>
        </div>

        <button
          type="submit"
          disabled={pending || personel.length === 0}
          className="w-fit rounded-control bg-gradient-to-b from-accent-600 to-accent-700 px-4 py-2 text-small font-medium text-white shadow-card transition hover:brightness-110 disabled:bg-slate-400 disabled:bg-none"
        >
          {pending ? "Kaydediliyor…" : "İzni kaydet"}
        </button>

        {state.error ? (
          <p className="rounded-control bg-danger-soft px-3 py-2 text-small text-danger-ink">
            {state.error}
          </p>
        ) : null}
        {state.saved ? (
          <p className="rounded-control bg-success-soft px-3 py-2 text-small text-success-ink">
            ✓ {state.saved}
          </p>
        ) : null}
      </form>
    </SectionCard>
  );
}
