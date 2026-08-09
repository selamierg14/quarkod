"use client";

import { useActionState, useState } from "react";
import { loginAction, type LoginState } from "./actions";

// "use server" dosyaları yalnızca async fonksiyon dışa aktarabilir; başlangıç
// durumu bu yüzden istemci tarafında duruyor.
const INITIAL_LOGIN_STATE: LoginState = { step: "kimlik", mode: "giris" };

const INPUT =
  "w-full rounded-xl border border-slate-200 bg-white p-3 text-[16px] outline-none focus:border-slate-400";

/**
 * Giriş, 2FA kodu ve şifre sıfırlama tek ekranda.
 *
 * Adımı sunucu belirler (state.step); form her gönderimde hangi adımda
 * olduğunu gizli alanla bildirir. Böylece tarayıcı geçmişi ya da yenileme
 * akışı bozmuyor.
 */
export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    INITIAL_LOGIN_STATE,
  );
  const [mode, setMode] = useState<"giris" | "sifre">("giris");

  // Sunucu bir adıma geçtiyse mod da ona uyar (ör. sıfırlama bitince girişe döner).
  const aktifMod = state.step === "kimlik" ? mode : state.mode;

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-3">
      <input type="hidden" name="step" value={state.step} />
      <input type="hidden" name="mode" value={aktifMod} />
      {state.maskedPhone ? (
        <input type="hidden" name="maskedPhone" value={state.maskedPhone} />
      ) : null}

      {state.step === "kimlik" ? (
        <>
          <label className="text-sm text-slate-600" htmlFor="username">
            Kullanıcı adı
          </label>
          <input
            id="username"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            className={INPUT}
          />

          {aktifMod === "giris" ? (
            <>
              <label className="mt-2 text-sm text-slate-600" htmlFor="password">
                Şifre
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={INPUT}
              />
            </>
          ) : (
            <p className="text-sm text-slate-500">
              Kayıtlı telefonunuza bir doğrulama kodu göndereceğiz.
            </p>
          )}
        </>
      ) : null}

      {state.step === "kod" ? (
        <>
          <p className="text-sm text-slate-600">
            <span className="font-medium text-slate-800">{state.maskedPhone}</span>{" "}
            numarasına gönderilen 6 haneli kodu girin.
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
      ) : null}

      {state.step === "yeni-sifre" ? (
        <>
          <p className="text-sm text-slate-600">
            Kod doğrulandı. Şimdi yeni şifrenizi belirleyin.
          </p>
          <label className="text-sm text-slate-600" htmlFor="newPassword">
            Yeni şifre (en az 8 karakter)
          </label>
          <input
            id="newPassword"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className={INPUT}
          />
          <label className="text-sm text-slate-600" htmlFor="newPasswordRepeat">
            Yeni şifre (tekrar)
          </label>
          <input
            id="newPasswordRepeat"
            name="passwordRepeat"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className={INPUT}
          />
        </>
      ) : null}

      {state.error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.info ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {state.info}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-3 rounded-xl bg-slate-900 px-5 py-3.5 font-medium text-white disabled:bg-slate-400"
      >
        {pending
          ? "Lütfen bekleyin…"
          : state.step === "kimlik"
            ? aktifMod === "giris"
              ? "Giriş yap"
              : "Kod gönder"
            : state.step === "kod"
              ? "Doğrula"
              : "Şifreyi güncelle"}
      </button>

      {state.step === "kimlik" ? (
        <button
          type="button"
          onClick={() => setMode(aktifMod === "giris" ? "sifre" : "giris")}
          className="mt-1 text-sm text-slate-500 underline underline-offset-2 hover:text-slate-800"
        >
          {aktifMod === "giris" ? "Şifremi unuttum" : "Girişe dön"}
        </button>
      ) : (
        <a
          href="/admin/giris"
          className="mt-1 text-center text-sm text-slate-500 underline underline-offset-2 hover:text-slate-800"
        >
          Baştan başla
        </a>
      )}
    </form>
  );
}
