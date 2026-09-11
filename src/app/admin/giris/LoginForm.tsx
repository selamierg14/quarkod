"use client";

import { useActionState, useState } from "react";
import { loginAction, type LoginState } from "./actions";
import { alanOzellikleri } from "@/lib/cekirdek/desenler";

// "use server" dosyaları yalnızca async fonksiyon dışa aktarabilir; başlangıç
// durumu bu yüzden istemci tarafında duruyor.
const INITIAL_LOGIN_STATE: LoginState = { step: "kimlik", mode: "giris" };

const INPUT =
  "w-full rounded-control border border-line bg-surface p-3 text-[16px] outline-none focus:border-line-strong";

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
          <label className="text-small text-ink-soft" htmlFor="username">
            Kullanıcı adı
          </label>
          <input
            id="username"
            name="username"
            {...alanOzellikleri("girisKimligi")}
            autoCapitalize="none"
            spellCheck={false}
            className={INPUT}
          />

          {aktifMod === "giris" ? (
            <>
              <label className="mt-2 text-small text-ink-soft" htmlFor="password">
                Şifre
              </label>
              <input
                id="password"
                name="password"
                {...alanOzellikleri("girisSifresi")}
                autoComplete="current-password"
                className={INPUT}
              />
            </>
          ) : (
            <p className="text-small text-ink-muted">
              Kayıtlı telefonunuza bir doğrulama kodu göndereceğiz.
            </p>
          )}
        </>
      ) : null}

      {state.step === "kod" ? (
        <>
          <p className="text-small text-ink-soft">
            <span className="font-medium text-ink-strong">{state.maskedPhone}</span>{" "}
            numarasına gönderilen 6 haneli kodu girin.
          </p>
          <label className="sr-only" htmlFor="code">
            Doğrulama kodu
          </label>
          <input
            id="code"
            name="code"
            {...alanOzellikleri("dogrulamaKodu")}
            autoFocus
            placeholder="––––––"
            className={`${INPUT} text-center font-mono text-2xl tracking-[0.4em]`}
          />

          {/* Kodu şu an hangi numaranın tuttuğu istekler arasında burada
              taşınıyor; sunucu her istekte durumu sıfırdan kuruyor. */}
          <input type="hidden" name="aktifSira" value={state.aktifSira ?? 0} />

          {/* Kod gelmediyse başka kayıtlı numaraya istemek — yedek
              numaraların var oluş sebebi. Yalnızca SIRA gönderiliyor;
              numaranın kendisi istemciye hiç inmiyor (bkz. actions.ts). */}
          {state.secenekler && state.secenekler.length > 0 ? (
            <div className="mt-1 flex flex-col gap-1.5">
              <span className="text-caption text-ink-muted">
                Kod gelmediyse başka numaranıza isteyin:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {state.secenekler.map((secenek) => (
                  <button
                    key={secenek.sira}
                    type="submit"
                    name="yenidenGonder"
                    value={secenek.sira}
                    // Kod alanı `required`; bu düğme kodu GÖNDERMİYOR, yeni
                    // kod İSTİYOR. Doğrulama atlanmazsa tarayıcı "bu alanı
                    // doldurun" deyip gönderimi engelliyor ve düğme hiç
                    // çalışmıyordu — üstelik sessizce, çünkü hata balonu
                    // boş kod alanını işaret ediyor.
                    formNoValidate
                    className="rounded-chip border border-line bg-surface px-2.5 py-1 text-caption text-ink-soft transition hover:border-line-strong hover:text-ink"
                  >
                    {secenek.maskeli}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {state.step === "yeni-sifre" ? (
        <>
          <p className="text-small text-ink-soft">
            Kod doğrulandı. Şimdi yeni şifrenizi belirleyin.
          </p>
          <label className="text-small text-ink-soft" htmlFor="newPassword">
            Yeni şifre (en az 8 karakter)
          </label>
          <input
            id="newPassword"
            name="password"
            {...alanOzellikleri("sifre")}
            autoComplete="new-password"
            className={INPUT}
          />
          <label className="text-small text-ink-soft" htmlFor="newPasswordRepeat">
            Yeni şifre (tekrar)
          </label>
          <input
            id="newPasswordRepeat"
            name="passwordRepeat"
            {...alanOzellikleri("sifre")}
            autoComplete="new-password"
            className={INPUT}
          />
        </>
      ) : null}

      {state.error ? (
        <p className="rounded-control bg-danger-soft px-4 py-3 text-small text-danger-ink" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.info ? (
        <p className="rounded-control bg-success-soft px-4 py-3 text-small text-success-ink">
          {state.info}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-3 rounded-control bg-gradient-to-r from-accent-600 to-accent-700 px-5 py-3.5 font-medium text-white shadow-card transition hover:from-accent-700 hover:to-accent-700 disabled:from-slate-400 disabled:to-slate-400"
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
          className="mt-1 text-small text-ink-muted underline underline-offset-2 hover:text-ink-strong"
        >
          {aktifMod === "giris" ? "Şifremi unuttum" : "Girişe dön"}
        </button>
      ) : (
        <a
          href="/admin/giris"
          className="mt-1 text-center text-small text-ink-muted underline underline-offset-2 hover:text-ink-strong"
        >
          Baştan başla
        </a>
      )}
    </form>
  );
}
