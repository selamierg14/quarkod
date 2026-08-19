"use client";

import { useActionState, useState, useTransition } from "react";
import { SHIFTS } from "@/lib/constants";
import { shiftNotuEkle, toggleGorev, type GorevFormState } from "./actions";

const INPUT =
  "rounded-chip border border-line bg-surface px-3 py-2 text-small outline-none focus:border-line-strong";

/**
 * Tıklayınca hemen (sunucu yanıtını beklemeden) işaretlenen görev satırı.
 *
 * Bu ekran günde defalarca kullanılıyor; her tıkta tam sayfa yenilenmesini
 * beklemek yavaş hissettiriyordu. Kutucuk anında değişir, sunucu isteği
 * arkadan gider — hata olursa (ör. yetki değişti) bir sonraki sayfa
 * yenilemesinde gerçek durum geri yazılır.
 */
export function GorevKutusu({
  itemId,
  businessId,
  label,
  tamamlayan,
  benim,
}: {
  itemId: string;
  businessId: string;
  label: string;
  /** Doluysa bugün kim tamamladı; boşsa henüz işaretlenmemiş. */
  tamamlayan: string | null;
  /** Oturum sahibinin adı — kendi işaretlemesinde ismi anında görünsün. */
  benim: string;
}) {
  const [yerelTamam, setYerelTamam] = useState(tamamlayan !== null);
  const [yerelTamamlayan, setYerelTamamlayan] = useState(tamamlayan);
  const [, startTransition] = useTransition();

  function tikla() {
    const yeniDurum = !yerelTamam;
    setYerelTamam(yeniDurum);
    setYerelTamamlayan(yeniDurum ? benim : null);

    const formData = new FormData();
    formData.set("itemId", itemId);
    formData.set("businessId", businessId);
    startTransition(() => {
      void toggleGorev(formData);
    });
  }

  return (
    <li>
      <button
        type="button"
        onClick={tikla}
        className={`flex w-full items-center gap-2.5 rounded-chip px-2.5 py-2 text-left text-small transition ${
          yerelTamam ? "bg-success-soft text-success-ink" : "bg-canvas text-ink-soft hover:bg-sunken"
        }`}
      >
        <span
          aria-hidden="true"
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
            yerelTamam ? "border-success bg-success text-white" : "border-line-strong"
          }`}
        >
          {yerelTamam ? "✓" : ""}
        </span>
        <span className="flex-1">
          {label}
          {yerelTamam ? (
            <span className="block text-caption text-success-ink/70">
              {yerelTamamlayan} tamamladı
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}

export function ShiftNotuFormu({
  businessId,
  varsayilanVardiya,
}: {
  businessId: string;
  varsayilanVardiya: string;
}) {
  const [state, formAction, pending] = useActionState<GorevFormState, FormData>(
    shiftNotuEkle,
    {},
  );

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-end gap-2">
      <input type="hidden" name="businessId" value={businessId} />

      <label className="flex flex-col gap-1">
        <span className="text-caption text-ink-muted">Vardiya</span>
        <select name="shift" defaultValue={varsayilanVardiya} className={INPUT}>
          {Object.entries(SHIFTS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-1 flex-col gap-1">
        <span className="text-caption text-ink-muted">Not</span>
        <input
          name="text"
          required
          placeholder="masa 5'te sorun oldu, dikkat..."
          className={`${INPUT} w-full`}
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-control bg-ink px-4 py-2 text-small font-medium text-white disabled:bg-slate-400"
      >
        {pending ? "Ekleniyor..." : "Ekle"}
      </button>

      {state.error ? (
        <p className="w-full text-caption text-danger">{state.error}</p>
      ) : null}
    </form>
  );
}
