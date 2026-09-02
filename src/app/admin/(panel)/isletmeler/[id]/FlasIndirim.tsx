"use client";

import { useActionState } from "react";
import { flasIndirimBaslat } from "../../duyurular/actions";
import type { DuyuruFormState } from "../../duyurular/actions";

const INPUT =
  "rounded-chip border border-line bg-surface px-3 py-2 text-small outline-none focus:border-line-strong";

const SURE_SECENEKLERI = [1, 2, 4, 8, 24];

export function FlasIndirim({ businessId, pushKredisi }: { businessId: string; pushKredisi: number }) {
  const [state, formAction, pending] = useActionState<DuyuruFormState, FormData>(
    flasIndirimBaslat,
    {},
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-control bg-canvas px-3 py-2.5">
        <p className="text-small text-ink-soft">
          Kalan kredin: <strong className="tabular">{pushKredisi}</strong>
        </p>
        <p className="mt-1 text-caption text-ink-faint">
          Her başlatma 1 kredi harcar ve Keşfet&apos;te/mekan profilinde öne çıkan, süreli bir
          duyuru açar. <strong>Not:</strong> yakındaki kullanıcılara anlık bildirim gönderme
          henüz aktif değil — bu buton şimdilik yalnızca duyuruyu yayınlıyor.
        </p>
      </div>

      {pushKredisi <= 0 ? (
        <p className="text-small text-ink-faint">
          Push krediniz kalmadı. Kredi tanımlanması için Quarkod ile iletişime geçin.
        </p>
      ) : (
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="businessId" value={businessId} />
          <label className="flex flex-col gap-1">
            <span className="text-small font-medium text-ink-soft">Başlık</span>
            <input
              name="baslik"
              required
              placeholder="2 saatliğine 2. kahve bizden!"
              maxLength={80}
              className={INPUT}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-small font-medium text-ink-soft">Süre</span>
            <select name="sureSaat" defaultValue={2} className={`${INPUT} w-40`}>
              {SURE_SECENEKLERI.map((s) => (
                <option key={s} value={s}>
                  {s} saat
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={pending}
            className="self-start rounded-control bg-accent-600 px-4 py-2 text-small font-medium text-white transition hover:bg-accent-700 disabled:bg-slate-400"
          >
            {pending ? "Başlatılıyor..." : "Flaş indirimi başlat"}
          </button>
          {state.error ? (
            <p className="rounded-chip bg-danger-soft px-3 py-2 text-small text-danger-ink">
              {state.error}
            </p>
          ) : null}
          {state.saved ? (
            <p className="rounded-chip bg-success-soft px-3 py-2 text-small text-success-ink">
              {state.saved}
            </p>
          ) : null}
        </form>
      )}
    </div>
  );
}
