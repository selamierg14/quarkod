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
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-5">
      <div className="w-full max-w-sm text-center">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning-soft text-2xl text-warning-ink"
          aria-hidden="true"
        >
          !
        </div>

        <h1 className="mt-5 text-xl font-semibold tracking-tight text-ink">
          Bir şeyler ters gitti
        </h1>
        <p className="mt-3 text-body leading-relaxed text-ink-soft">
          Sayfa yüklenemedi. Genellikle tekrar denemek yeterli oluyor.
        </p>

        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-control bg-accent-600 px-5 py-3 text-small font-medium text-white transition hover:bg-accent-700"
        >
          Tekrar dene
        </button>

        {error.digest ? (
          <p className="mt-6 text-caption text-ink-faint">
            Sorun sürerse bu kodu iletin: <code>{error.digest}</code>
          </p>
        ) : null}
      </div>
    </main>
  );
}
