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
import { alanOzellikleri } from "@/lib/cekirdek/desenler";
import { GonderDugmesi, SilDugmesi, buttonClass } from "@/components/ui";

const INPUT =
  "w-full rounded-control border border-line bg-surface px-3 py-2 text-small text-ink outline-none placeholder:text-ink-faint transition focus:border-accent-500 focus:ring-2 focus:ring-accent-100";

export function NewRotaForm() {
  const [state, formAction, pending] = useActionState<RotaFormState, FormData>(rotaEkle, {});

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">Rota adı</span>
          <input
            name="ad"
            {...alanOzellikleri("isletmeAdi")}
            placeholder="Kadıköy Kahve Rotası"
            className={INPUT}
          />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-caption text-ink-muted">Açıklama (isteğe bağlı)</span>
          <textarea
            name="aciklama"
            {...alanOzellikleri("aciklama", { zorunlu: false })}
            rows={2}
            placeholder="Kadıköy'ün en sevilen 4 üçüncü nesil kahvecisi. Hepsini gez, rozeti kap!"
            className={INPUT}
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={pending}
        className={buttonClass({ size: "md", className: "self-start" })}
      >
        {pending ? "Oluşturuluyor..." : "Rota oluştur"}
      </button>
      {state.error ? (
        <p className="rounded-chip bg-danger-soft px-3 py-2 text-small text-danger-ink" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p className="rounded-chip bg-success-soft px-3 py-2 text-small text-success-ink" role="status">
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
      <GonderDugmesi
        className={`rounded-chip px-2.5 py-1 text-caption font-medium ${
          aktif ? "bg-success-soft text-success-ink" : "border border-line text-ink-faint"
        }`}
      >
        {aktif ? "Yayında" : "Pasif"}
      </GonderDugmesi>
    </form>
  );
}

export function RotaSilButonu({ id }: { id: string }) {
  return (
    <form action={rotaSil}>
      <input type="hidden" name="id" value={id} />
      <SilDugmesi
        className="rounded-chip px-2 py-1 text-caption text-ink-faint hover:text-danger"
      
            onayMetni="Rota silinsin mi?"
            onayClassName="bg-danger-soft text-danger-ink font-medium">
        Rotayı sil
      </SilDugmesi>
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
        className={buttonClass({ variant: "secondary", size: "sm" })}
      >
        {pending ? "Ekleniyor..." : "Durak ekle"}
      </button>
      {state.error ? <span className="text-caption text-danger" role="alert">{state.error}</span> : null}
    </form>
  );
}

export function DurakSilButonu({ id }: { id: string }) {
  return (
    <form action={durakSil}>
      <input type="hidden" name="id" value={id} />
      <SilDugmesi
        className="rounded-chip px-2 py-0.5 text-caption text-ink-faint hover:text-danger"
      
            onayMetni="Durak çıkarılsın mı?"
            onayClassName="bg-danger-soft text-danger-ink font-medium">
        Çıkar
      </SilDugmesi>
    </form>
  );
}
