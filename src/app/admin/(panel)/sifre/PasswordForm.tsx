"use client";

import { useActionState } from "react";
import { changeOwnPassword, type UserFormState } from "../kullanicilar/actions";

const INPUT =
  "rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[16px] outline-none focus:border-slate-400";

export function PasswordForm() {
  const [state, formAction, pending] = useActionState<UserFormState, FormData>(
    changeOwnPassword,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-500">Mevcut şifre</span>
        <input
          name="current"
          type="password"
          autoComplete="current-password"
          required
          className={INPUT}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-500">Yeni şifre (en az 8 karakter)</span>
        <input
          name="next"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={INPUT}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-500">Yeni şifre (tekrar)</span>
        <input
          name="repeat"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={INPUT}
        />
      </label>

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

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:bg-slate-400"
      >
        {pending ? "Değiştiriliyor..." : "Şifreyi değiştir"}
      </button>
    </form>
  );
}
