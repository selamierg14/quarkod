"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm({ devam }: { devam: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    {},
  );

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-3">
      <input type="hidden" name="devam" value={devam} />

      <label className="text-sm text-slate-600" htmlFor="email">
        E-posta
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="username"
        required
        className="rounded-xl border border-slate-200 bg-white p-3 text-[16px] outline-none focus:border-slate-400"
      />

      <label className="mt-2 text-sm text-slate-600" htmlFor="password">
        Şifre
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        className="rounded-xl border border-slate-200 bg-white p-3 text-[16px] outline-none focus:border-slate-400"
      />

      {state.error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-3 rounded-xl bg-slate-900 px-5 py-3.5 font-medium text-white disabled:bg-slate-400"
      >
        {pending ? "Giriş yapılıyor..." : "Giriş yap"}
      </button>
    </form>
  );
}
