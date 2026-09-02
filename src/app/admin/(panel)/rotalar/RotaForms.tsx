"use client";

import { useActionState } from "react";
import {
  durakEkle,
  durakSil,
  rotaAktifDegistir,
  rotaEkle,
  rotaSil,
  type RotaFormState,
} from "./actions";

const INPUT =
  "w-full rounded-chip border border-line bg-surface px-3 py-2 text-small outline-none focus:border-line-strong";

export function NewRotaForm() {
  const [state, formAction, pending] = useActionState<RotaFormState, FormData>(rotaEkle, {});

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">Rota adı</span>
          <input name="ad" required placeholder="Kadıköy Kahve Rotası" className={INPUT} />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-caption text-ink-muted">Açıklama (isteğe bağlı)</span>
          <textarea
            name="aciklama"
            rows={2}
            placeholder="Kadıköy'ün en sevilen 4 üçüncü nesil kahvecisi. Hepsini gez, rozeti kap!"
            className={INPUT}
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-control bg-accent-600 px-4 py-2 text-small font-medium text-white transition hover:bg-accent-700 disabled:bg-slate-400"
      >
        {pending ? "Oluşturuluyor..." : "Rota oluştur"}
      </button>
      {state.error ? (
        <p className="rounded-chip bg-danger-soft px-3 py-2 text-small text-danger-ink">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p className="rounded-chip bg-success-soft px-3 py-2 text-small text-success-ink">
          {state.saved}
        </p>
      ) : null}
    </form>
  );
}

export function AktifButonu({ id, aktif }: { id: string; aktif: boolean }) {
  return (
    <form action={rotaAktifDegistir}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className={`rounded-chip px-2.5 py-1 text-caption font-medium ${
          aktif ? "bg-success-soft text-success-ink" : "border border-line text-ink-faint"
        }`}
      >
        {aktif ? "Yayında" : "Pasif"}
      </button>
    </form>
  );
}

export function RotaSilButonu({ id }: { id: string }) {
  return (
    <form action={rotaSil}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-chip px-2 py-1 text-caption text-ink-faint hover:text-danger"
      >
        Rotayı sil
      </button>
    </form>
  );
}

export function DurakEkleForm({
  rotaId,
  mekanlar,
}: {
  rotaId: string;
  mekanlar: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<RotaFormState, FormData>(durakEkle, {});

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="rotaId" value={rotaId} />
      <select name="businessId" required className={`${INPUT} max-w-xs`} defaultValue="">
        <option value="" disabled>
          Mekan seç…
        </option>
        {mekanlar.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="rounded-control border border-line px-3 py-2 text-caption font-medium text-ink-soft hover:bg-canvas disabled:opacity-60"
      >
        {pending ? "Ekleniyor..." : "Durak ekle"}
      </button>
      {state.error ? <span className="text-caption text-danger">{state.error}</span> : null}
    </form>
  );
}

export function DurakSilButonu({ id }: { id: string }) {
  return (
    <form action={durakSil}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-chip px-2 py-0.5 text-caption text-ink-faint hover:text-danger"
      >
        Çıkar
      </button>
    </form>
  );
}
