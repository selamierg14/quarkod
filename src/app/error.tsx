"use client";

import { useEffect } from "react";

/**
 * Beklenmeyen sunucu/istemci hatasında gösterilir.
 *
 * Next'in varsayılan ekranı İngilizce ve teknik; masadaki müşteri de bu ekranı
 * görebileceği için sade ve Türkçe tutuldu. Hata ayrıntısı kullanıcıya
 * gösterilmez, konsola ve sunucu kaydına düşer.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[hata] sayfa render edilemedi:", error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-5">
      <div className="w-full max-w-sm text-center">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-2xl text-amber-700"
          aria-hidden="true"
        >
          !
        </div>

        <h1 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">
          Bir şeyler ters gitti
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
          Sayfa yüklenemedi. Genellikle tekrar denemek yeterli oluyor.
        </p>

        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white"
        >
          Tekrar dene
        </button>

        {error.digest ? (
          <p className="mt-6 text-xs text-slate-400">
            Sorun sürerse bu kodu iletin: <code>{error.digest}</code>
          </p>
        ) : null}
      </div>
    </main>
  );
}
