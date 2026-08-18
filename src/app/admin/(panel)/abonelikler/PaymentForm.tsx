"use client";

import { useActionState } from "react";
import { recordPayment } from "../hesaplar/actions";
import type { AccountFormState } from "../hesaplar/actions";

/**
 * Bir aboneliğe ödeme işleyen satır formu.
 *
 * Tutar + isteğe bağlı süre uzatması + serbest not. Uzatma "0 ay" bırakılırsa
 * yalnızca gelir kaydı düşer, tarih değişmez (örn. bir bağış ya da düzeltme).
 */
export function PaymentForm({ accountId }: { accountId: string }) {
  const [state, formAction, pending] = useActionState<AccountFormState, FormData>(
    recordPayment,
    {},
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="accountId" value={accountId} />

      <label className="flex flex-col gap-1">
        <span className="text-caption text-ink-muted">Tutar (₺)</span>
        <input
          name="amount"
          inputMode="decimal"
          required
          placeholder="1290"
          className="w-24 rounded-chip border border-line bg-surface px-2.5 py-1.5 text-small outline-none focus:border-line-strong"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-caption text-ink-muted">Uzat</span>
        <select
          name="uzatmaAy"
          defaultValue="1"
          className="rounded-chip border border-line bg-surface px-2.5 py-1.5 text-small outline-none focus:border-line-strong"
        >
          <option value="0">Uzatma yok</option>
          <option value="1">1 ay</option>
          <option value="3">3 ay</option>
          <option value="6">6 ay</option>
          <option value="12">12 ay</option>
        </select>
      </label>

      <label className="flex flex-1 flex-col gap-1">
        <span className="text-caption text-ink-muted">Not (isteğe bağlı)</span>
        <input
          name="note"
          placeholder="IBAN havale — Ağustos"
          className="min-w-32 rounded-chip border border-line bg-surface px-2.5 py-1.5 text-small outline-none focus:border-line-strong"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-chip bg-ink px-3 py-1.5 text-small font-medium text-white disabled:bg-slate-400"
      >
        {pending ? "…" : "Ödeme kaydet"}
      </button>

      {state.error ? (
        <span className="w-full text-caption text-danger-ink">{state.error}</span>
      ) : null}
      {state.saved ? (
        <span className="w-full text-caption text-success-ink">{state.saved}</span>
      ) : null}
    </form>
  );
}
