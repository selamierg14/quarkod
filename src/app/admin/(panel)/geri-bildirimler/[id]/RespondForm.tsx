"use client";

import { useActionState } from "react";
import { respondToCustomer, type RespondState } from "./actions";

/**
 * Şikayet döngüsünü kapatan yanıt kutusu.
 *
 * Yalnızca müşteri rıza verip iletişim bilgisi bıraktığında ve bilgi hâlâ
 * duruyorken gösterilir — bu koşulu sayfa denetliyor, sunucu bir kez daha
 * denetliyor. Gönderilince kayıt "çözüldü"ye geçer; bir kez yanıtlandıysa
 * kutu yerini "ne zaman, ne yazıldı" özetine bırakır.
 */
export function RespondForm({
  id,
  channel,
  alreadyResponded,
}: {
  id: string;
  /** "telefon" → SMS, "eposta" → e-posta. Butonun etiketini belirler. */
  channel: "telefon" | "eposta";
  alreadyResponded: boolean;
}) {
  const [state, formAction, pending] = useActionState<RespondState, FormData>(
    respondToCustomer,
    {},
  );

  const gonderildi = alreadyResponded || state.sent;

  if (gonderildi) {
    return (
      <p className="mt-3 rounded-control bg-success-soft px-3 py-2 text-caption text-success-ink">
        Müşteriye {channel === "eposta" ? "e-posta" : "SMS"} ile yanıt gönderildi.
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <label className="text-caption font-medium tracking-wide text-ink-muted uppercase">
        Müşteriye yanıt yaz
      </label>
      <textarea
        name="mesaj"
        rows={3}
        maxLength={480}
        required
        placeholder={
          channel === "eposta"
            ? "Örn: Geri bildiriminiz için teşekkürler, sorunu çözdük..."
            : "Kısa bir SMS yazın; müşterinin numarasına gönderilir."
        }
        className="rounded-control border border-line bg-surface px-3 py-2 text-small outline-none focus:border-line-strong"
      />
      {state.error ? (
        <p className="text-caption text-danger-ink">{state.error}</p>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <span className="text-caption text-ink-faint">
          {channel === "eposta" ? "E-posta gönderilir." : "SMS gönderilir."} Yanıt
          kayıt olarak saklanır ve durum “çözüldü”ye geçer.
        </span>
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-control bg-accent-600 px-4 py-2 text-small font-medium text-white transition hover:bg-accent-700 disabled:bg-slate-400"
        >
          {pending ? "Gönderiliyor…" : "Gönder"}
        </button>
      </div>
    </form>
  );
}
