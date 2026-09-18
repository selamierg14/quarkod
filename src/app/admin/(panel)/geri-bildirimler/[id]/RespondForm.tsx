"use client";

import { useActionState, useState } from "react";
import type { HazirYanit } from "@/lib/isletme/hazir-yanit";
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
  hazirYanitlar,
}: {
  id: string;
  /** "telefon" → SMS, "eposta" → e-posta. Butonun etiketini belirler. */
  channel: "telefon" | "eposta";
  alreadyResponded: boolean;
  /** Puana göre seçilmiş şablonlar (bkz. lib/isletme/hazir-yanit.ts). */
  hazirYanitlar: HazirYanit[];
}) {
  const [state, formAction, pending] = useActionState<RespondState, FormData>(
    respondToCustomer,
    {},
  );
  /**
   * Metin kontrollü bir alana taşındı: şablona dokunulduğunda kutunun
   * dolması gerekiyor. `defaultValue` ile bunu yapmanın yolu yok.
   */
  const [mesaj, setMesaj] = useState("");

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
      {/* Şablonlar metni GETİRİYOR, göndermiyor: gönderilmeden önce
          düzenlenebilmesi şart — yanlış şikayete hazır cümle göndermek,
          hiç yanıt vermemekten kötü. */}
      {hazirYanitlar.length > 0 && !mesaj ? (
        <div className="flex flex-wrap gap-1.5">
          {hazirYanitlar.map((yanit) => (
            <button
              key={yanit.etiket}
              type="button"
              onClick={() => setMesaj(yanit.metin)}
              className="rounded-chip border border-line px-2.5 py-1 text-caption text-ink hover:bg-sunken"
            >
              {yanit.etiket}
            </button>
          ))}
        </div>
      ) : null}

      <textarea
        name="mesaj"
        rows={3}
        maxLength={480}
        required
        value={mesaj}
        onChange={(e) => setMesaj(e.target.value)}
        placeholder={
          channel === "eposta"
            ? "Örn: Geri bildiriminiz için teşekkürler, sorunu çözdük..."
            : "Kısa bir SMS yazın; müşterinin numarasına gönderilir."
        }
        className="rounded-control border border-line bg-surface px-3 py-2 text-small outline-none focus:border-line-strong"
      />
      {state.error ? (
        <p className="text-caption text-danger-ink" role="alert">{state.error}</p>
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
