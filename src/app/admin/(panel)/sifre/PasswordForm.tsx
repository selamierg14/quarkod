"use client";

import { useActionState } from "react";
import { changeOwnPassword, type PasswordState } from "../kullanicilar/actions";

const INITIAL: PasswordState = { step: "form" };

const INPUT =
  "rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[16px] outline-none focus:border-slate-400";

/**
 * Şifre değiştirme iki adımlı: doğrulama sonrası kayıtlı telefona kod gider.
 * Adımı sunucu belirler; form hangi adımda olduğunu gizli alanla bildirir.
 */
export function PasswordForm() {
  const [state, formAction, pending] = useActionState<PasswordState, FormData>(
    changeOwnPassword,
    INITIAL,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="step" value={state.step} />
      {state.maskedPhone ? (
        <input type="hidden" name="maskedPhone" value={state.maskedPhone} />
      ) : null}

      {state.step === "form" ? (
        <>
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
            <span className="text-xs text-slate-500">
              Yeni şifre (en az 8 karakter)
            </span>
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

          <p className="text-xs text-slate-400">
            Devam ettiğinizde kayıtlı telefonunuza bir doğrulama kodu gönderilir.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm text-slate-600">
            <span className="font-medium text-slate-800">{state.maskedPhone}</span>{" "}
            numarasına gönderilen 6 haneli kodu girin. Kod doğrulanmadan şifre
            değişmez.
          </p>
          <label className="sr-only" htmlFor="code">
            Doğrulama kodu
          </label>
          <input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            pattern="[0-9]{6}"
            required
            autoFocus
            placeholder="––––––"
            className={`${INPUT} text-center font-mono text-2xl tracking-[0.4em]`}
          />
        </>
      )}

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
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
        {pending
          ? "Lütfen bekleyin…"
          : state.step === "form"
            ? "Devam et"
            : "Kodu doğrula ve şifreyi değiştir"}
      </button>
    </form>
  );
}
