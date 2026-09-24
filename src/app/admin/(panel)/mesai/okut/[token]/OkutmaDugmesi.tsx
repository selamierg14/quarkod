"use client";

import { useActionState } from "react";
import { mesaiOkut, type MesaiFormState } from "../../actions";

/**
 * Tek düğme, iki anlam: açık kayıt yoksa giriş, varsa çıkış.
 *
 * Düğme BÜYÜK ve tek: ekran servis sırasında, tek elle, çoğu zaman
 * kalabalıkta kullanılıyor. Sonuç aynı ekranda yazıyor — "kaydedildi
 * mi" diye tekrar okutmak, ikinci bir kayıt açmanın en kolay yolu
 * olurdu (o yüzden sunucuda 60 saniyelik pencere de var).
 */
export function OkutmaDugmesi({ token, cikisMi }: { token: string; cikisMi: boolean }) {
  const [durum, eylem, bekliyor] = useActionState<MesaiFormState, FormData>(mesaiOkut, {});

  return (
    <form action={eylem} className="flex w-full flex-col items-center gap-3">
      <input type="hidden" name="token" value={token} />
      <button
        type="submit"
        disabled={bekliyor}
        className={`flex h-32 w-full max-w-xs items-center justify-center rounded-card text-lg font-semibold text-white shadow-card transition disabled:opacity-60 ${
          cikisMi
            ? "bg-gradient-to-br from-amber-500 to-amber-600"
            : "bg-gradient-to-br from-emerald-500 to-emerald-600"
        }`}
      >
        {bekliyor ? "Kaydediliyor…" : cikisMi ? "Çıkış yap" : "Giriş yap"}
      </button>

      {durum.error ? (
        <p
          className="w-full rounded-control bg-danger-soft px-3 py-2 text-center text-small text-danger-ink"
          role="alert"
        >
          {durum.error}
        </p>
      ) : null}
      {durum.saved ? (
        <p
          className="w-full rounded-control bg-success-soft px-3 py-2 text-center text-small text-success-ink"
          role="status"
        >
          {durum.saved}
        </p>
      ) : null}
    </form>
  );
}
