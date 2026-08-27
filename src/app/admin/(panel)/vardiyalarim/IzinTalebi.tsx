"use client";

import { useActionState, useState } from "react";
import { CalendarOff } from "lucide-react";
import { SectionCard } from "@/components/ui";
import { IZIN_TURLERI } from "@/lib/izin";
import {
  izinTalepEt,
  type IzinFormState,
} from "../vardiya-planlama/izinler/actions";

const INPUT =
  "w-full rounded-chip border border-line bg-surface px-3 py-2 text-small outline-none focus:border-line-strong";

/**
 * Personelin kendi izin talebi.
 *
 * Vardiya değişim talebiyle aynı akış: talep "bekliyor" doğar, yönetici
 * onaylayana kadar çizelgeye yansımaz. Böylece "izinli olduğu ne belli"
 * sorusunun cevabı hep bir kayıt oluyor — kim istedi, kim onayladı.
 */
export function IzinTalebi({
  gecmisTalepler,
}: {
  gecmisTalepler: {
    id: string;
    baslangic: string;
    bitis: string;
    tur: string;
    status: string;
  }[];
}) {
  const [acik, setAcik] = useState(false);
  const [state, formAction, pending] = useActionState<IzinFormState, FormData>(
    izinTalepEt,
    {},
  );

  const bugun = new Date().toISOString().slice(0, 10);

  return (
    <SectionCard
      ikon={<CalendarOff className="h-4 w-4" aria-hidden="true" />}
      renk="rose"
      title="İzin taleplerim"
      description="Talebiniz yöneticinize gider; onaylanınca çizelgede o günler izinli görünür."
      action={
        !acik ? (
          <button
            type="button"
            onClick={() => setAcik(true)}
            className="rounded-control bg-gradient-to-b from-accent-600 to-accent-700 px-3.5 py-2 text-small font-medium text-white shadow-card transition hover:brightness-110"
          >
            İzin talep et
          </button>
        ) : null
      }
    >
      {acik ? (
        <form action={formAction} className="mb-4 flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-caption text-ink-muted">Başlangıç</span>
              <input name="baslangic" type="date" required min={bugun} className={INPUT} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-caption text-ink-muted">Bitiş</span>
              <input name="bitis" type="date" required min={bugun} className={INPUT} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-caption text-ink-muted">Tür</span>
              <select name="tur" defaultValue="yillik" className={INPUT}>
                {Object.entries(IZIN_TURLERI).map(([deger, etiket]) => (
                  <option key={deger} value={deger}>
                    {etiket}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-caption text-ink-muted">Sebep (isteğe bağlı)</span>
              <input name="aciklama" placeholder="Düğün, sağlık, okul…" className={INPUT} />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-control bg-gradient-to-b from-accent-600 to-accent-700 px-4 py-2 text-small font-medium text-white shadow-card transition hover:brightness-110 disabled:bg-slate-400 disabled:bg-none"
            >
              {pending ? "Gönderiliyor…" : "Talebi gönder"}
            </button>
            <button
              type="button"
              onClick={() => setAcik(false)}
              className="rounded-control border border-line bg-surface px-4 py-2 text-small text-ink-soft transition hover:bg-canvas"
            >
              Vazgeç
            </button>
          </div>

          {state.error ? (
            <p className="rounded-control bg-danger-soft px-3 py-2 text-small text-danger-ink">
              {state.error}
            </p>
          ) : null}
          {state.saved ? (
            <p className="rounded-control bg-success-soft px-3 py-2 text-small text-success-ink">
              ✓ {state.saved}
            </p>
          ) : null}
        </form>
      ) : null}

      {gecmisTalepler.length === 0 ? (
        <p className="text-small text-ink-muted">Henüz bir izin talebiniz yok.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {gecmisTalepler.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-chip bg-canvas px-3 py-2 text-small"
            >
              <span>
                {t.baslangic === t.bitis ? t.baslangic : `${t.baslangic} – ${t.bitis}`}
                <span className="ml-2 text-caption text-ink-muted">{t.tur}</span>
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-caption font-medium ${
                  t.status === "onaylandi"
                    ? "bg-success-soft text-success-ink"
                    : t.status === "bekliyor"
                      ? "bg-warning-soft text-warning-ink"
                      : "bg-sunken text-ink-faint"
                }`}
              >
                {t.status === "onaylandi"
                  ? "Onaylandı"
                  : t.status === "bekliyor"
                    ? "Bekliyor"
                    : "Reddedildi"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
