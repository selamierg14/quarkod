"use client";

import { useActionState, useRef, useState } from "react";
import { changeOwnPassword, type PasswordState } from "../kullanicilar/actions";
import { alanOzellikleri } from "@/lib/cekirdek/desenler";

const INITIAL: PasswordState = {};

const INPUT =
  "rounded-chip border border-line bg-surface px-3 py-2.5 text-[16px] outline-none focus:border-line-strong";

/**
 * Şifre değiştirme — tek ekran: mevcut şifre + yeni şifre (iki kez).
 *
 * İkinci kutu bir YAZIM HATASI kalkanı. Şifre alanında yazdığını
 * göremediğin için tek kutulu bir form, yanlış yazılmış bir şifreyi
 * sessizce kaydeder ve kullanıcı bunu ancak bir sonraki girişte —
 * hesabından çıkmışken — fark eder.
 *
 * Uyuşmazlık burada ANINDA söyleniyor (ikinci kutudan çıkarken), sunucudan
 * dönen hatayı beklemeden. Sunucu da aynı kontrolü yapıyor; buradaki
 * yalnızca daha hızlı.
 */
export function PasswordForm() {
  const [state, formAction, pending] = useActionState<PasswordState, FormData>(
    changeOwnPassword,
    INITIAL,
  );

  const yeniRef = useRef<HTMLInputElement>(null);
  const [uyusmazlik, setUyusmazlik] = useState(false);

  function tekrarKontrol(tekrar: string) {
    const yeni = yeniRef.current?.value ?? "";
    // Kullanıcı daha yazarken kırmızı göstermek erken ve rahatsız edici;
    // yalnızca ikinci kutuda bir şey varken karşılaştırılıyor.
    setUyusmazlik(tekrar.length > 0 && yeni !== tekrar);
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-caption text-ink-muted">Mevcut şifre</span>
        <input
          name="current"
          {...alanOzellikleri("girisSifresi")}
          autoComplete="current-password"
          className={INPUT}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-caption text-ink-muted">Yeni şifre (en az 8 karakter)</span>
        <input
          ref={yeniRef}
          name="next"
          {...alanOzellikleri("sifre")}
          autoComplete="new-password"
          className={INPUT}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-caption text-ink-muted">Yeni şifre (tekrar)</span>
        <input
          name="repeat"
          {...alanOzellikleri("sifre")}
          autoComplete="new-password"
          onChange={(e) => tekrarKontrol(e.target.value)}
          aria-invalid={uyusmazlik || undefined}
          aria-describedby={uyusmazlik ? "sifre-uyusmazlik" : undefined}
          className={`${INPUT} ${uyusmazlik ? "border-danger-ink" : ""}`}
        />
      </label>

      {uyusmazlik ? (
        <p id="sifre-uyusmazlik" role="alert" className="text-caption text-danger-ink">
          İki şifre birbiriyle uyuşmuyor.
        </p>
      ) : null}

      {state.error ? (
        <p className="rounded-chip bg-danger-soft px-3 py-2 text-small text-danger-ink" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p
          className="rounded-chip bg-success-soft px-3 py-2 text-small text-success-ink"
          role="status"
        >
          {state.saved}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-control bg-accent-600 px-4 py-2.5 text-small font-medium text-white transition hover:bg-accent-700 disabled:bg-slate-400"
      >
        {pending ? "Değiştiriliyor…" : "Şifreyi değiştir"}
      </button>
    </form>
  );
}
