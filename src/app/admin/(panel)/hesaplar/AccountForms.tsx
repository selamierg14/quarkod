"use client";

import { useActionState, useState } from "react";
import { createAccount, toggleAccount, type AccountFormState } from "./actions";

const INPUT =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400";

export function NewAccountForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<AccountFormState, FormData>(
    createAccount,
    {},
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600 hover:bg-white"
      >
        + Yeni müşteri hesabı aç
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-xl bg-white p-5 ring-1 ring-slate-200"
    >
      <h2 className="font-semibold tracking-tight">Yeni hesap</h2>
      <p className="text-sm text-slate-500">
        Hesap ve ilk sahibi birlikte açılır. Sahibi daha sonra kendi
        işletmelerini ve sorumlularını kendisi ekler.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Hesap adı (firma/zincir)</span>
          <input name="name" required className={INPUT} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Sahibinin adı</span>
          <input name="ownerName" required className={INPUT} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Sahibinin e-postası</span>
          <input name="ownerEmail" type="email" required className={INPUT} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Başlangıç şifresi</span>
          <input
            name="password"
            type="text"
            required
            minLength={8}
            placeholder="en az 8 karakter"
            className={INPUT}
          />
        </label>
      </div>

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.saved}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:bg-slate-400"
        >
          {pending ? "Açılıyor..." : "Hesabı aç"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-600"
        >
          Kapat
        </button>
      </div>
    </form>
  );
}

export function ToggleAccountButton({
  accountId,
  active,
}: {
  accountId: string;
  active: boolean;
}) {
  return (
    <form action={toggleAccount}>
      <input type="hidden" name="accountId" value={accountId} />
      <button
        type="submit"
        title={
          active
            ? "Askıya alınınca kullanıcılar giremez ve QR'lar çalışmaz; veri silinmez."
            : "Hesabı yeniden aktif et"
        }
        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
      >
        {active ? "Askıya al" : "Aktifleştir"}
      </button>
    </form>
  );
}
