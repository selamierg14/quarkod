"use client";

import { useActionState, useState } from "react";
import { recordPayment } from "../hesaplar/actions";
import type { AccountFormState } from "../hesaplar/actions";
import { Dialog, KorunanForm, buttonClass } from "@/components/ui";

const INPUT =
  "h-9 rounded-control border border-line bg-surface px-3 text-small text-ink outline-none placeholder:text-ink-faint focus:border-accent-500 focus:ring-2 focus:ring-accent-100";

/**
 * "Ödeme kaydet" düğmesi + penceresi.
 *
 * Önceden form her hesabın satırında hep açıktı: dört alanlı bir şerit
 * listeyi seyreltiyor, "1290" yer tutucusu da girilmiş bir değer gibi
 * duruyordu (UI incelemesi). Artık satırda tek düğme; form pencerede.
 *
 * Tutar + isteğe bağlı süre uzatması + serbest not. Uzatma "Uzatma yok"
 * bırakılırsa yalnızca gelir kaydı düşer, tarih değişmez.
 */
export function PaymentForm({ accountId, hesapAdi }: { accountId: string; hesapAdi: string }) {
  const [acik, setAcik] = useState(false);
  const [state, formAction, pending] = useActionState<AccountFormState, FormData>(
    recordPayment,
    {},
  );

  // Kayıt başarılıysa pencere kapanıyor (effect yerine render sırasında).
  const [sonSonuc, setSonSonuc] = useState(state);
  if (state !== sonSonuc) {
    setSonSonuc(state);
    if (state.saved) setAcik(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAcik(true)}
        className={buttonClass({ variant: "secondary", size: "sm" })}
      >
        Ödeme kaydet
      </button>
      {state.saved && !acik ? (
        <span className="text-caption font-medium text-success-ink" role="status">
          ✓ {state.saved}
        </span>
      ) : null}

      <Dialog acik={acik} onClose={() => setAcik(false)} baslik="Ödeme kaydet" aciklama={hesapAdi}>
        <KorunanForm action={formAction} sonuc={state} className="flex flex-col gap-3">
          <input type="hidden" name="accountId" value={accountId} />

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-caption text-ink-muted">Tutar (₺)</span>
              <input
                name="amount"
                inputMode="decimal"
                required
                placeholder="ör. 1290"
                className={INPUT}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-caption text-ink-muted">Süreyi uzat</span>
              <select name="uzatmaAy" defaultValue="1" className={INPUT}>
                <option value="0">Uzatma yok</option>
                <option value="1">1 ay</option>
                <option value="3">3 ay</option>
                <option value="6">6 ay</option>
                <option value="12">12 ay</option>
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-caption text-ink-muted">Not (isteğe bağlı)</span>
            <input name="note" placeholder="ör. IBAN havale — Ağustos" className={INPUT} />
          </label>

          {state.error ? (
            <p className="rounded-chip bg-danger-soft px-3 py-2 text-small text-danger-ink" role="alert">
              {state.error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-line pt-3">
            <button
              type="button"
              onClick={() => setAcik(false)}
              className={buttonClass({ variant: "ghost", size: "sm" })}
            >
              Vazgeç
            </button>
            <button type="submit" disabled={pending} className={buttonClass({ size: "sm" })}>
              {pending ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        </KorunanForm>
      </Dialog>
    </>
  );
}
